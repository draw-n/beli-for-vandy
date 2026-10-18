"""Image validation, optimization, and internal GridFS photo storage."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
import secrets
import warnings
from typing import Any

from PIL import Image, ImageCms, ImageOps, UnidentifiedImageError
from gridfs.errors import NoFile

import database


MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_IMAGE_PIXELS = 40_000_000
MAX_IMAGE_DIMENSION = 1600
WEBP_QUALITY = 92

_FORMATS = {
    "JPEG": ("image/jpeg", "jpg"),
    "PNG": ("image/png", "png"),
    "WEBP": ("image/webp", "webp"),
}


class InvalidPhotoError(ValueError):
    """The submitted bytes are not a supported, safe image."""


class PhotoTooLargeError(InvalidPhotoError):
    """The upload exceeds the configured byte or pixel limit."""


class PhotoNotFoundError(LookupError):
    """No stored photo exists for the requested ID."""


@dataclass(frozen=True)
class ProcessedPhoto:
    data: bytes
    content_type: str
    extension: str


@dataclass(frozen=True)
class StoredPhoto:
    photo_id: str
    data: bytes
    content_type: str
    owner_uuid: str | None
    status: str = "pending"


def _encode(image: Image.Image, image_format: str, *, quality: int = WEBP_QUALITY) -> bytes:
    output = BytesIO()
    if image_format == "WEBP":
        image.save(
            output,
            format="WEBP",
            quality=quality,
            method=6,
            alpha_quality=100,
        )
    elif image_format == "WEBP_LOSSLESS":
        image.save(output, format="WEBP", lossless=True, method=6)
    elif image_format == "JPEG":
        image.convert("RGB").save(
            output, format="JPEG", quality=94, optimize=True, progressive=True
        )
    else:
        image.save(output, format="PNG", optimize=True, compress_level=9)
    return output.getvalue()


def _to_srgb(image: Image.Image) -> Image.Image:
    has_alpha = "A" in image.getbands() or "transparency" in image.info
    alpha = image.convert("RGBA").getchannel("A") if has_alpha else None
    icc_profile = image.info.get("icc_profile")

    if icc_profile:
        try:
            source_profile = ImageCms.ImageCmsProfile(BytesIO(icc_profile))
            srgb_profile = ImageCms.createProfile("sRGB")
            source = image if image.mode in ("RGB", "CMYK", "L") else image.convert("RGB")
            converted = ImageCms.profileToProfile(
                source, source_profile, srgb_profile, outputMode="RGB"
            )
        except (ImageCms.PyCMSError, OSError, ValueError):
            converted = image.convert("RGB")
    else:
        converted = image.convert("RGB")

    if alpha is not None:
        converted.putalpha(alpha)
    return converted


def process_photo(data: bytes) -> ProcessedPhoto:
    """Validate and optimize one bounded JPEG, PNG, or WebP upload."""
    if not data:
        raise InvalidPhotoError("The uploaded image is empty.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise PhotoTooLargeError("Images must be 5 MB or smaller.")

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as probe:
                source_format = probe.format
                if source_format not in _FORMATS:
                    raise InvalidPhotoError("Upload a JPEG, PNG, or WebP image.")
                if probe.width * probe.height > MAX_IMAGE_PIXELS:
                    raise PhotoTooLargeError("The image dimensions are too large.")
                if getattr(probe, "n_frames", 1) != 1:
                    raise InvalidPhotoError("Animated images are not supported.")
                probe.verify()

            with Image.open(BytesIO(data)) as opened:
                image = ImageOps.exif_transpose(opened)
                image.load()
                image = _to_srgb(image)

                resized = max(image.size) > MAX_IMAGE_DIMENSION
                if resized:
                    image.thumbnail(
                        (MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION),
                        Image.Resampling.LANCZOS,
                    )

                has_alpha = "A" in image.getbands()
                if source_format in ("PNG",) or has_alpha:
                    candidates = [
                        ("WEBP", _encode(image, "WEBP_LOSSLESS")),
                        ("PNG", _encode(image, "PNG")),
                    ]
                    output_format, output_data = min(candidates, key=lambda item: len(item[1]))
                else:
                    webp_data = _encode(image, "WEBP", quality=WEBP_QUALITY)
                    if source_format == "JPEG" and not resized and len(webp_data) >= len(data):
                        # Keep already-efficient JPEGs intact when they have no metadata to strip.
                        has_metadata = any(
                            opened.info.get(key)
                            for key in ("exif", "xmp", "comment", "photoshop", "iptc")
                        )
                        if not has_metadata:
                            output_format, output_data = "JPEG", data
                        else:
                            jpeg_data = _encode(image, "JPEG")
                            output_format, output_data = min(
                                [("WEBP", webp_data), ("JPEG", jpeg_data)],
                                key=lambda item: len(item[1]),
                            )
                    else:
                        output_format, output_data = "WEBP", webp_data

                if source_format == "WEBP" and not resized:
                    has_metadata = any(
                        opened.info.get(key) for key in ("exif", "xmp")
                    )
                    if not has_metadata:
                        output_format, output_data = "WEBP", data

        content_type, extension = _FORMATS[output_format]
        return ProcessedPhoto(output_data, content_type, extension)
    except (InvalidPhotoError, PhotoTooLargeError):
        raise
    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as error:
        raise PhotoTooLargeError("The image dimensions are too large.") from error
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as error:
        raise InvalidPhotoError("The uploaded file is not a valid image.") from error


def _photo_bucket(bucket: Any | None = None) -> Any:
    if bucket is not None:
        return bucket

    from motor.motor_asyncio import AsyncIOMotorGridFSBucket

    return AsyncIOMotorGridFSBucket(database.db, bucket_name="photos")


async def store_photo(
    data: bytes,
    *,
    owner_uuid: str | None = None,
    bucket: Any | None = None,
) -> str:
    """Optimize and store one image in GridFS; returns its opaque ID."""
    photo = process_photo(data)
    photo_id = secrets.token_urlsafe(24)
    metadata = {
        "content_type": photo.content_type,
        "uploaded_at": datetime.now(timezone.utc),
        "status": "pending",
    }
    if owner_uuid is not None:
        metadata["owner_uuid"] = owner_uuid

    await _photo_bucket(bucket).upload_from_stream_with_id(
        photo_id,
        f"{photo_id}.{photo.extension}",
        BytesIO(photo.data),
        metadata=metadata,
    )
    return photo_id


async def retrieve_photo(photo_id: str, *, bucket: Any | None = None) -> StoredPhoto:
    """Read a stored image and its response content type from GridFS."""
    try:
        stream = await _photo_bucket(bucket).open_download_stream(photo_id)
    except NoFile as error:
        raise PhotoNotFoundError("Photo not found.") from error

    metadata = stream.metadata or {}
    data = await stream.read()
    return StoredPhoto(
        photo_id=photo_id,
        data=data,
        content_type=metadata.get("content_type", "application/octet-stream"),
        owner_uuid=metadata.get("owner_uuid"),
        status=metadata.get("status", "pending"),
    )


async def get_photo_owner(
    photo_id: str, *, bucket: Any | None = None
) -> str | None:
    """Read GridFS owner metadata without loading the stored image bytes."""
    try:
        stream = await _photo_bucket(bucket).open_download_stream(photo_id)
    except NoFile as error:
        raise PhotoNotFoundError("Photo not found.") from error

    metadata = stream.metadata or {}
    return metadata.get("owner_uuid")


def photo_files_collection(*, bucket: Any | None = None) -> Any:
    """Return this GridFS bucket's files collection (also injectable in tests)."""
    collection = getattr(bucket, "files_collection", None) if bucket is not None else None
    if collection is not None:
        return collection
    bucket_name = getattr(bucket, "bucket_name", "photos")
    return database.db.get_collection(f"{bucket_name}.files")


async def claim_photo(
    photo_id: str,
    claim: str,
    *,
    bucket: Any | None = None,
) -> bool:
    """Atomically reserve a pending photo for attachment or cleanup."""
    result = await photo_files_collection(bucket=bucket).update_one(
        {
            "_id": photo_id,
            "metadata.status": "pending",
            "metadata.cleanup_claim": {"$exists": False},
        },
        {"$set": {"metadata.cleanup_claim": claim}},
    )
    return result.matched_count == 1


async def release_photo_claim(
    photo_id: str,
    claim: str,
    *,
    bucket: Any | None = None,
) -> None:
    await photo_files_collection(bucket=bucket).update_one(
        {"_id": photo_id, "metadata.cleanup_claim": claim},
        {"$unset": {"metadata.cleanup_claim": ""}},
    )


async def mark_photo_attached(
    photo_id: str,
    *,
    bucket: Any | None = None,
) -> None:
    await photo_files_collection(bucket=bucket).update_one(
        {"_id": photo_id},
        {"$unset": {"metadata.unreferenced_since": ""}},
    )


async def mark_photo_unreferenced(
    photo_id: str,
    *,
    bucket: Any | None = None,
    at: datetime | None = None,
) -> None:
    await photo_files_collection(bucket=bucket).update_one(
        {"_id": photo_id},
        {"$set": {"metadata.unreferenced_since": at or datetime.now(timezone.utc)}},
    )
