#!/bin/bash

# Start Moji Services for Production Testing
# This script starts both Pet Brain and iMessage Bridge services

echo "🚀 Starting Moji Services..."
echo ""

# Check if .env files exist
if [ ! -f "pet-brain/.env" ]; then
  echo "❌ Error: pet-brain/.env not found"
  echo "   Please create .env file in pet-brain directory"
  exit 1
fi

if [ ! -f "imessage-bridge/.env" ]; then
  echo "❌ Error: imessage-bridge/.env not found"
  echo "   Please create .env file in imessage-bridge directory"
  exit 1
fi

# Start Pet Brain (Terminal 1)
echo "📦 Starting Pet Brain on port 3001..."
cd pet-brain
bun run dev &
PET_BRAIN_PID=$!
echo "   Pet Brain started (PID: $PET_BRAIN_PID)"
cd ..

# Wait a bit for Pet Brain to start
sleep 3

# Start iMessage Bridge (Terminal 2)
echo "🌉 Starting iMessage Bridge on port 3000..."
cd imessage-bridge
bun run dev &
BRIDGE_PID=$!
echo "   iMessage Bridge started (PID: $BRIDGE_PID)"
cd ..

echo ""
echo "✅ Both services started!"
echo ""
echo "Pet Brain PID: $PET_BRAIN_PID"
echo "Bridge PID: $BRIDGE_PID"
echo ""
echo "To stop services, run:"
echo "  kill $PET_BRAIN_PID $BRIDGE_PID"
echo ""
echo "Or press Ctrl+C to stop this script"
echo ""
echo "🧪 Ready to test! Try these commands in your iMessage group chat:"
echo "   @moji sticker: a cute cat with big eyes"
echo "   @moji meme: finals stress"
echo ""

# Wait for user interrupt
wait

