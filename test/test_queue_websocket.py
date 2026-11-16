
import asyncio
import websockets
import os
import json

async def test_connection():
    token = os.environ.get("DJ_ACCESS_TOKEN")

    if not token:
        print("JWT token is missing.")
        return

    url = (
        "ws://127.0.0.1:8000/ws/lounges/19"
        "?token=" + token
    )

    try:
        async with websockets.connect(url) as websocket:
            print("Connected to lounge 19 WebSocket")
            print("Waiting for queue updates...")

            while True:
                message = await asyncio.wait_for(
                    websocket.recv(),
                    timeout=120
                )

                data = json.loads(message)
                print("Received event:", data.get("event"))
                print(message)

                if data.get("event") == "lounge.queue.update":
                    print("SUCCESS: Live queue update received!")
                    break

    except asyncio.TimeoutError:
        print("No queue update received within 120 seconds.")
    except Exception as error:
        print("WebSocket test failed:", error)


asyncio.run(test_connection())
