import unittest

from pydantic import ValidationError

from models.user import UserCreate, UserLogin, UserType, UserUpdate


def valid_user_payload(**overrides):
    return {
        "username": "commodore",
        "first_name": "Cornelius",
        "last_name": "Vanderbilt",
        "email": "person@example.com",
        "password": "abc",
        "type": UserType.STUDENT,
        "home_city": "Nashville",
        **overrides,
    }


class UserModelTestCase(unittest.TestCase):
    def test_user_update_accepts_only_the_fields_being_changed(self) -> None:
        update = UserUpdate(first_name="New", home_city="Franklin")

        self.assertEqual(
            update.model_dump(exclude_unset=True),
            {"first_name": "New", "home_city": "Franklin"},
        )

    def test_registration_accepts_password_at_and_above_minimum_length(self) -> None:
        for password in ("abc", "abcd"):
            with self.subTest(password=password):
                self.assertEqual(UserCreate(**valid_user_payload(password=password)).password, password)

    def test_registration_rejects_password_below_minimum_length(self) -> None:
        with self.assertRaises(ValidationError):
            UserCreate(**valid_user_payload(password="ab"))

    def test_login_accepts_one_character_password_and_rejects_empty_password(self) -> None:
        self.assertEqual(UserLogin(username="a", password="x").password, "x")
        with self.assertRaises(ValidationError):
            UserLogin(username="commodore", password="")

    def test_required_identity_fields_reject_empty_or_whitespace_values(self) -> None:
        for field in ("username", "first_name", "last_name", "home_city"):
            for value in ("", "   "):
                with self.subTest(field=field, value=value):
                    with self.assertRaises(ValidationError):
                        UserCreate(**valid_user_payload(**{field: value}))

    def test_registration_rejects_malformed_email_and_invalid_account_type(self) -> None:
        for overrides in ({"email": "not-an-email"}, {"type": "alumni"}):
            with self.subTest(overrides=overrides):
                with self.assertRaises(ValidationError):
                    UserCreate(**valid_user_payload(**overrides))


if __name__ == "__main__":
    unittest.main()
