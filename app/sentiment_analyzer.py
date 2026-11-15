
import re

POSITIVE_WORDS = {
    "amazing", "awesome", "beautiful", "best", "brilliant",
    "cool", "dance", "enjoy", "excellent", "excited",
    "fantastic", "fun", "good", "great", "happy",
    "love", "lovely", "nice", "perfect", "positive",
    "super", "wonderful", "wow" , "like"
}

NEGATIVE_WORDS = {
    "angry", "annoying", "awful", "bad", "boring",
    "disappointed", "dislike", "hate", "horrible",
    "sad", "slow", "terrible", "worst", "negative",
    "tired", "upset", "waste"
}

NEGATIONS = {"not", "no", "never", "hardly", "isn't", "wasn't", "don't", "doesn't"}


def analyze_sentiment(message: str) -> dict:
    """Return a basic sentiment label and normalized score."""

    if not isinstance(message, str) or not message.strip():
        return {"sentiment": "neutral", "score": 0.0}

    words = re.findall(r"[a-z']+", message.lower())

    total_score = 0
    matched_words = 0

    for index, word in enumerate(words):
        if word in POSITIVE_WORDS:
            word_score = 1
        elif word in NEGATIVE_WORDS:
            word_score = -1
        else:
            continue

        previous_words = words[max(0, index - 3):index]

        if any(previous in NEGATIONS for previous in previous_words):
            word_score *= -1

        total_score += word_score
        matched_words += 1

    if matched_words == 0:
        score = 0.0
    else:
        score = round(total_score / matched_words, 2)

    if score > 0.15:
        sentiment = "positive"
    elif score < -0.15:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    return {
        "sentiment": sentiment,
        "score": score
    }

from collections import deque

ROOM_HISTORY_LIMIT = 20

room_sentiment_history = {}


def update_room_sentiment(lounge_id: int, message: str) -> dict:
    """Update and return the rolling sentiment for a lounge."""

    if lounge_id not in room_sentiment_history:
        room_sentiment_history[lounge_id] = deque(
            maxlen=ROOM_HISTORY_LIMIT
        )

    result = analyze_sentiment(message)
    room_sentiment_history[lounge_id].append(result["score"])

    scores = room_sentiment_history[lounge_id]
    average_score = round(sum(scores) / len(scores), 2)

    if average_score > 0.15:
        overall_sentiment = "positive"
    elif average_score < -0.15:
        overall_sentiment = "negative"
    else:
        overall_sentiment = "neutral"

    return {
        "lounge_id": lounge_id,
        "sentiment": overall_sentiment,
        "score": average_score,
        "message_count": len(scores)
    }
