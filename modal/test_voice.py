"""Unit tests for the pure helpers of modal/voice.py. They don't need torch or the models:

    scripts/derisk/.venv/bin/python -m unittest discover -s modal   (a path would clash with the modal package)
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from voice import fill_unaligned, pause_after_group  # noqa: E402


class FillUnaligned(unittest.TestCase):
    def test_unaligned_words_get_the_previous_end_and_score_zero(self):
        out = fill_unaligned(["Le", "37", "cœur"], {0: (0.1, 0.3, 0.9), 2: (0.5, 0.9, 0.8)})
        self.assertEqual(out, [("Le", 0.1, 0.3, 0.9), ("37", 0.3, 0.3, 0.0), ("cœur", 0.5, 0.9, 0.8)])

    def test_first_word_unaligned_starts_at_zero(self):
        out = fill_unaligned(["—", "Le", "cœur"], {1: (0.2, 0.4, 0.9), 2: (0.5, 0.9, 0.8)})
        self.assertEqual(out[0], ("—", 0.0, 0.0, 0.0))

    def test_first_word_unaligned_starts_at_the_sentence_start(self):
        out = fill_unaligned(["12", "fois"], {1: (4.2, 4.6, 0.7)}, start=3.9)
        self.assertEqual(out[0], ("12", 3.9, 3.9, 0.0))

    def test_a_sentence_with_no_aligned_word_keeps_every_word(self):
        out = fill_unaligned(["1", "2"], {}, start=2.0)
        self.assertEqual(out, [("1", 2.0, 2.0, 0.0), ("2", 2.0, 2.0, 0.0)])


class PauseAfterGroup(unittest.TestCase):
    def test_a_short_title_is_padded_to_three_seconds(self):
        self.assertAlmostEqual(pause_after_group(0, 1.2, last=False), 1.8 + 0.6)

    def test_a_long_title_only_gets_the_group_pause(self):
        self.assertAlmostEqual(pause_after_group(0, 3.4, last=False), 0.6)

    def test_scenes_get_the_group_pause(self):
        self.assertAlmostEqual(pause_after_group(2, 20.0, last=False), 0.6)

    def test_nothing_after_the_last_group(self):
        self.assertEqual(pause_after_group(7, 140.0, last=True), 0.0)


if __name__ == "__main__":
    unittest.main()
