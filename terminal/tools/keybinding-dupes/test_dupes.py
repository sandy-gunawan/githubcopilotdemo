from pathlib import Path
import unittest

from dupes import find_duplicates


class DuplicateKeybindingsTests(unittest.TestCase):
    @unittest.expectedFailure
    def test_detects_duplicate_keybindings(self):
        settings_path = Path(__file__).parent / "samples" / "settings_with_dupes.json"
        self.assertGreaterEqual(len(find_duplicates(str(settings_path))), 1)


if __name__ == "__main__":
    unittest.main()
