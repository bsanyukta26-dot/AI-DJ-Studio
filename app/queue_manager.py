import time
from typing import Dict, List
from fastapi import WebSocket

class QueueConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self.lounge_presence: Dict[int, int] = {}

    async def connect(self, lounge_id: int, websocket: WebSocket):
        await websocket.accept()

        if lounge_id not in self.active_connections:
            self.active_connections[lounge_id] = []

        self.active_connections[lounge_id].append(websocket)

        self.lounge_presence[lounge_id] = len(
            self.active_connections[lounge_id]
        )

        await self.broadcast(
            lounge_id,
            {
                "event": "lounge.presence.update",
                "payload": {
                    "connected_clients": self.lounge_presence[lounge_id]
                }
            }
        )
    def disconnect(self, lounge_id: int, websocket: WebSocket):
        if lounge_id in self.active_connections:
            if websocket in self.active_connections[lounge_id]:
                self.active_connections[lounge_id].remove(websocket)

            if not self.active_connections[lounge_id]:
                del self.active_connections[lounge_id]

        remaining_clients = len(
            self.active_connections.get(lounge_id, [])
        )

        if remaining_clients > 0:
            self.lounge_presence[lounge_id] = remaining_clients
        else:
            self.lounge_presence.pop(lounge_id, None)

        # Schedule a presence update through the existing async broadcast method.
        import asyncio

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(
                self.broadcast(
                    lounge_id,
                    {
                        "event": "lounge.presence.update",
                        "payload": {
                            "connected_clients": remaining_clients
                        }
                    }
                )
            )
        except RuntimeError:
            pass


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
