#!/bin/bash

echo "🚀 Starting Moji Services for Testing"
echo ""

# Kill any existing processes
pkill -f "bun run.*pet-brain" 2>/dev/null
pkill -f "bun run.*imessage-bridge" 2>/dev/null
sleep 1

# Start Pet Brain
echo "📦 Starting Pet Brain (port 3001)..."
cd pet-brain
bun run dev > /tmp/moji-brain.log 2>&1 &
BRAIN_PID=$!
echo "   Pet Brain PID: $BRAIN_PID"
cd ..

# Wait for Pet Brain to start
sleep 3

# Check if Pet Brain is running
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "   ✅ Pet Brain is running!"
else
  echo "   ⚠️  Pet Brain may still be starting..."
fi

# Start iMessage Bridge
echo "🌉 Starting iMessage Bridge (port 3000)..."
cd imessage-bridge
bun run dev > /tmp/moji-bridge.log 2>&1 &
BRIDGE_PID=$!
echo "   Bridge PID: $BRIDGE_PID"
cd ..

# Wait for Bridge to start
sleep 3

# Check if Bridge is running
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "   ✅ Bridge is running!"
else
  echo "   ⚠️  Bridge may still be starting..."
fi

echo ""
echo "✅ Services started!"
echo ""
echo "📊 Service Status:"
echo "   Pet Brain: http://localhost:3001/health"
echo "   Bridge: http://localhost:3000/health"
echo ""
echo "📝 Logs:"
echo "   Pet Brain: tail -f /tmp/moji-brain.log"
echo "   Bridge: tail -f /tmp/moji-bridge.log"
echo ""
echo "🧪 Test Commands (in your iMessage group chat):"
echo "   @moji sticker: a cute cat with big eyes"
echo "   @moji meme: finals stress"
echo ""
echo "🛑 To stop services:"
echo "   kill $BRAIN_PID $BRIDGE_PID"
echo "   Or: pkill -f 'bun run.*pet-brain' && pkill -f 'bun run.*imessage-bridge'"
echo ""
echo "Press Ctrl+C to exit (services will keep running in background)"
echo ""

# Keep script running
wait

