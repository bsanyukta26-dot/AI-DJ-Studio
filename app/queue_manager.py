import time
from typing import Dict, List
from fastapi import WebSocket


class QueueConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, lounge_id: int, websocket: WebSocket):
        await websocket.accept()

        if lounge_id not in self.active_connections:
            self.active_connections[lounge_id] = []

        self.active_connections[lounge_id].append(websocket)

    def disconnect(self, lounge_id: int, websocket: WebSocket):
        if lounge_id in self.active_connections:
            if websocket in self.active_connections[lounge_id]:
                self.active_connections[lounge_id].remove(websocket)

            if not self.active_connections[lounge_id]:
                del self.active_connections[lounge_id]

    async def broadcast(self, lounge_id: int, message: dict):
        connections = self.active_connections.get(lounge_id, [])

        # Convert the existing message into the PRD event envelope.
        event_name = message.get("event", "lounge.queue.update")

        if "payload" in message:
            payload = message["payload"]
        else:
            payload = {
                key: value
                for key, value in message.items()
                if key not in ("event", "loungeId", "ts")
            }

        event_message = {
            "event": event_name,
            "loungeId": lounge_id,
            "payload": payload,
            "ts": int(time.time() * 1000)
        }

        for websocket in connections[:]:
            try:
                await websocket.send_json(event_message)
            except Exception:
                self.disconnect(lounge_id, websocket)


queue_manager = QueueConnectionManager()
