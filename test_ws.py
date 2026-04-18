import asyncio
import websockets
import json

async def test_websocket():
    room_id = "8a892de6-c78a-4dac-8d9d-491d6cf2f232"
    token = "120e94b2-850b-4a9b-ab4c-1d6ec42d7640"
    uri = f"ws://localhost:8000/ws/rooms/{room_id}?token={token}"
    
    print(f"Connecting to {uri}")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected! Sending test message...")
            
            # Send test message
            test_msg = {
                "type": "chat_message",
                "content": "Hello from test!",
                "chat_type": "cityGroup"
            }
            await websocket.send(json.dumps(test_msg))
            print(f"Sent: {test_msg}")
            
            # Wait for response
            print("Waiting for messages...")
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                print(f"Received: {response}")
            except asyncio.TimeoutError:
                print("Timeout waiting for response")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())