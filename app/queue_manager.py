
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

        for websocket in connections[:]:
            try:
                await websocket.send_json(message)
            except Exception:
                self.disconnect(lounge_id, websocket)


queue_manager = QueueConnectionManager()
