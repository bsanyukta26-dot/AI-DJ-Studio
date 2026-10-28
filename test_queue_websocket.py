
import asyncio
import websockets


async def test_connection():
    url = "ws://127.0.0.1:8000/ws/lounges/1"

    try:
        async with websockets.connect(url) as websocket:
            print("Connected to lounge 1 WebSocket")
            print("Waiting for a queue update...")

            message = await asyncio.wait_for(
                websocket.recv(),
                timeout=60
            )

            print("Received live update:")
            print(message)

    except asyncio.TimeoutError:
        print("Connected, but no queue update arrived within 60 seconds.")
    except Exception as error:
        print("WebSocket test failed:", error)


asyncio.run(test_connection())
