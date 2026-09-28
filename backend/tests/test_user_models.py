import unittest

from models.user import UserUpdate


class UserModelTestCase(unittest.TestCase):
    def test_user_update_accepts_only_the_fields_being_changed(self) -> None:
        update = UserUpdate(first_name="New", home_city="Franklin")

        self.assertEqual(
            update.model_dump(exclude_unset=True),
            {"first_name": "New", "home_city": "Franklin"},
        )


if __name__ == "__main__":
    unittest.main()
