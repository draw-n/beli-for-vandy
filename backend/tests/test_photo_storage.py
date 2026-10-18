from io import BytesIO

import pytest
from gridfs.errors import NoFile
from PIL import Image, ImageChops, ImageStat

from controllers.photo_storage import (
    MAX_IMAGE_DIMENSION,
    MAX_IMAGE_PIXELS,
    InvalidPhotoError,
    PhotoNotFoundError,
    PhotoTooLargeError,
    process_photo,
    retrieve_photo,
    store_photo,
)


def image_bytes(image_format: str, *, size=(96, 64), color=(210, 90, 40)) -> bytes:
    output = BytesIO()
    Image.new("RGB", size, color).save(output, format=image_format)
    return output.getvalue()


@pytest.mark.parametrize("image_format", ["JPEG", "PNG", "WEBP"])
def test_processes_supported_formats(image_format):
    result = process_photo(image_bytes(image_format))

    assert result.content_type in ("image/jpeg", "image/png", "image/webp")
    with Image.open(BytesIO(result.data)) as decoded:
        decoded.load()
        assert decoded.size == (96, 64)


def test_corrects_exif_orientation_and_removes_exif_metadata():
    source = Image.new("RGB", (120, 60), (20, 120, 180))
    exif = Image.Exif()
    exif[274] = 6
    data = BytesIO()
    source.save(data, format="JPEG", exif=exif)

    result = process_photo(data.getvalue())

    with Image.open(BytesIO(result.data)) as decoded:
        assert decoded.size == (60, 120)
        assert not decoded.getexif()


def test_resizes_without_changing_aspect_ratio():
    result = process_photo(image_bytes("JPEG", size=(3200, 1600)))

    with Image.open(BytesIO(result.data)) as decoded:
        assert decoded.size == (MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION // 2)


def test_png_transparency_is_preserved_and_metadata_removed():
    source = Image.new("RGBA", (30, 20), (255, 0, 0, 80))
    data = BytesIO()
    source.save(data, format="PNG", pnginfo=None)

    result = process_photo(data.getvalue())

    with Image.open(BytesIO(result.data)) as decoded:
        assert decoded.mode in ("RGBA", "LA")
        assert decoded.getpixel((0, 0))[3] == 80
        assert not decoded.info.get("exif")


def test_compresses_photographic_jpeg_without_enlarging_it():
    source = Image.new("RGB", (600, 400))
    source.putdata(
        [((x * 17) % 256, (y * 29) % 256, ((x + y) * 11) % 256)
         for y in range(400) for x in range(600)]
    )
    original = BytesIO()
    source.save(original, format="JPEG", quality=95)

    result = process_photo(original.getvalue())

    assert len(result.data) < len(original.getvalue())
    assert result.content_type in ("image/webp", "image/jpeg")
    source_decoded = Image.open(BytesIO(original.getvalue())).convert("RGB")
    result_decoded = Image.open(BytesIO(result.data)).convert("RGB")
    difference = ImageStat.Stat(ImageChops.difference(source_decoded, result_decoded))
    assert sum(difference.mean) / 3 < 10


def test_rejects_empty_corrupt_unsupported_and_oversized_uploads():
    with pytest.raises(InvalidPhotoError, match="empty"):
        process_photo(b"")
    with pytest.raises(InvalidPhotoError, match="valid image"):
        process_photo(b"not an image")
    truncated = image_bytes("PNG")[:-8]
    with pytest.raises(InvalidPhotoError, match="valid image"):
        process_photo(truncated)
    with pytest.raises(InvalidPhotoError, match="JPEG, PNG, or WebP"):
        process_photo(image_bytes("GIF"))
    with pytest.raises(PhotoTooLargeError, match="5 MB"):
        process_photo(b"0" * (5 * 1024 * 1024 + 1))


@pytest.mark.parametrize(
    "pixel_count",
    [MAX_IMAGE_PIXELS - 1, MAX_IMAGE_PIXELS, MAX_IMAGE_PIXELS + 1],
    ids=["just-below", "at-limit", "just-above"],
)
def test_decoded_pixel_limit_boundary(pixel_count):
    image = Image.new("1", (pixel_count, 1), 1)
    output = BytesIO()
    image.save(output, format="PNG", optimize=True)

    if pixel_count > MAX_IMAGE_PIXELS:
        with pytest.raises(PhotoTooLargeError, match="dimensions"):
            process_photo(output.getvalue())
    else:
        with Image.open(BytesIO(process_photo(output.getvalue()).data)) as decoded:
            assert decoded.size == (MAX_IMAGE_DIMENSION, 1)


def test_upload_byte_limit_accepts_below_and_exact_limit_rejects_above():
    valid_png = image_bytes("PNG")
    assert len(valid_png) < 5 * 1024 * 1024

    below = valid_png + b"\0" * (5 * 1024 * 1024 - 1 - len(valid_png))
    exact = valid_png + b"\0" * (5 * 1024 * 1024 - len(valid_png))
    above = exact + b"\0"

    assert len(below) == 5 * 1024 * 1024 - 1
    assert len(exact) == 5 * 1024 * 1024
    process_photo(below)
    process_photo(exact)
    with pytest.raises(PhotoTooLargeError, match="5 MB"):
        process_photo(above)


class FakeGridFSBucket:
    def __init__(self):
        self.files = {}

    async def upload_from_stream_with_id(
        self, file_id, filename, source, *, metadata
    ):
        self.files[file_id] = {
            "filename": filename,
            "data": source.read(),
            "metadata": metadata,
        }

    async def open_download_stream(self, file_id):
        if file_id not in self.files:
            raise NoFile("Photo not found")
        return FakeGridOut(self.files[file_id])


class FakeGridOut:
    def __init__(self, file_record):
        self._data = file_record["data"]
        self.metadata = file_record["metadata"]

    async def read(self):
        return self._data


@pytest.mark.asyncio
async def test_gridfs_storage_round_trips_optimized_photo_and_content_type():
    bucket = FakeGridFSBucket()
    photo_id = await store_photo(image_bytes("JPEG"), bucket=bucket)

    assert photo_id in bucket.files
    assert bucket.files[photo_id]["metadata"]["status"] == "pending"
    assert bucket.files[photo_id]["metadata"]["uploaded_at"] is not None

    retrieved = await retrieve_photo(photo_id, bucket=bucket)
    assert retrieved.photo_id == photo_id
    assert retrieved.content_type == bucket.files[photo_id]["metadata"]["content_type"]
    assert retrieved.data == bucket.files[photo_id]["data"]


@pytest.mark.asyncio
async def test_gridfs_retrieval_reports_missing_photo():
    with pytest.raises(PhotoNotFoundError, match="not found"):
        await retrieve_photo("missing-photo", bucket=FakeGridFSBucket())
