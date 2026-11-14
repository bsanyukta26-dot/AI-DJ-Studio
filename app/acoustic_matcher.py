
from typing import Any, Dict, List


def get_value(track: Any, field: str):
    """Read a track field from either a dictionary or an object."""
    if isinstance(track, dict):
        return track.get(field)
    return getattr(track, field, None)


def bpm_compatible(bpm1: float, bpm2: float) -> bool:
    """Check BPM compatibility, including half-time and double-time."""
    if not bpm1 or not bpm2:
        return False

    ratios = [
        bpm1 / bpm2,
        bpm1 / (bpm2 * 2),
        (bpm1 * 2) / bpm2
    ]

    return any(0.92 <= ratio <= 1.08 for ratio in ratios)


def camelot_compatible(key1: str, key2: str) -> bool:
    """Check Camelot harmonic compatibility."""
    if not key1 or not key2:
        return False

    key1 = key1.upper()
    key2 = key2.upper()

    try:
        number1, letter1 = int(key1[:-1]), key1[-1]
        number2, letter2 = int(key2[:-1]), key2[-1]
    except (ValueError, IndexError):
        return False

    if not (1 <= number1 <= 12 and 1 <= number2 <= 12):
        return False

    if letter1 not in ("A", "B") or letter2 not in ("A", "B"):
        return False

    # Same key
    if number1 == number2 and letter1 == letter2:
        return True

    # Adjacent keys on the Camelot wheel
    if letter1 == letter2:
        return (number1 - number2) % 12 in (1, 11)

    # Relative major/minor
    if number1 == number2:
        return True

    return False


def energy_fit(energy1: float, energy2: float) -> float:
    """Calculate energy similarity on a 0-1 scale."""
    if energy1 is None or energy2 is None:
        return 0.0

    try:
        difference = abs(float(energy1) - float(energy2))
        return max(0.0, 1.0 - difference)
    except (ValueError, TypeError):
        return 0.0


def calculate_match_score(
    source_track: Any,
    candidate_track: Any,
    recency_score: float = 0.5
) -> float:
    """
    Calculate weighted acoustic compatibility.

    Harmonic compatibility: 50%
    Energy fit: 30%
    Recency: 20%
    """

    bpm1 = get_value(source_track, "bpm")
    bpm2 = get_value(candidate_track, "bpm")

    key1 = get_value(source_track, "camelot_key")
    key2 = get_value(candidate_track, "camelot_key")

    energy1 = get_value(source_track, "energy")
    energy2 = get_value(candidate_track, "energy")

    # Reject incompatible tracks
    if not bpm_compatible(bpm1, bpm2):
        return 0.0

    if not camelot_compatible(key1, key2):
        return 0.0

    harmonic_score = 1.0

    energy_score = energy_fit(energy1, energy2)

    recency_score = max(0.0, min(1.0, recency_score))

    final_score = (
        harmonic_score * 0.50
        + energy_score * 0.30
        + recency_score * 0.20
    )

    return round(final_score * 100, 2)


def rank_candidates(
    source_track: Any,
    candidates: List[Any],
    recency_scores: Dict[int, float] = None
) -> List[Dict]:
    """Filter and rank compatible tracks."""

    recency_scores = recency_scores or {}
    ranked_tracks = []

    for track in candidates:
        track_id = get_value(track, "id")

        score = calculate_match_score(
            source_track,
            track,
            recency_scores.get(track_id, 0.5)
        )

        if score > 0:
            ranked_tracks.append({
                "track": track,
                "match_score": score
            })

    return sorted(
        ranked_tracks,
        key=lambda item: item["match_score"],
        reverse=True
    )
