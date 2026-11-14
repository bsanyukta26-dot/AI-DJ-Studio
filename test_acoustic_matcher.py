
import unittest

from app.acoustic_matcher import (
    bpm_compatible,
    camelot_compatible,
    energy_fit,
    calculate_match_score,
    rank_candidates
)


class TestAcousticMatcher(unittest.TestCase):

    def setUp(self):
        self.source = {
            "id": 1,
            "bpm": 120,
            "camelot_key": "8A",
            "energy": 0.8
        }

        self.candidate = {
            "id": 2,
            "bpm": 124,
            "camelot_key": "9A",
            "energy": 0.9
        }

    def test_bpm_compatibility(self):
        self.assertTrue(bpm_compatible(120, 124))

    def test_half_time_compatibility(self):
        self.assertTrue(bpm_compatible(120, 60))

    def test_incompatible_bpm(self):
        self.assertFalse(bpm_compatible(120, 180))

    def test_camelot_compatibility(self):
        self.assertTrue(camelot_compatible("8A", "9A"))

    def test_incompatible_camelot(self):
        self.assertFalse(camelot_compatible("8A", "3B"))

    def test_energy_fit(self):
        self.assertAlmostEqual(energy_fit(0.8, 0.9), 0.9)

    def test_match_score(self):
        score = calculate_match_score(
            self.source,
            self.candidate
        )
        self.assertEqual(score, 87.0)

    def test_reject_incompatible_track(self):
        candidate = self.candidate.copy()
        candidate["camelot_key"] = "3B"

        score = calculate_match_score(
            self.source,
            candidate
        )

        self.assertEqual(score, 0.0)

    def test_rank_candidates(self):
        results = rank_candidates(
            self.source,
            [self.candidate]
        )

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["track"]["id"], 2)
        self.assertEqual(results[0]["match_score"], 87.0)


if __name__ == "__main__":
    unittest.main()
