#!/bin/bash

# Moji UI Startup Script
# Starts Bridge, Brain, and Desktop UI

echo "🚀 Starting Moji System..."
echo ""

# Kill existing processes
echo "Cleaning up existing processes..."
pkill -9 -f "bun.*index" 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 2

# Start Pet Brain
echo "Starting Pet Brain (port 3001)..."
cd pet-brain
bun run src/index.ts > /tmp/moji-brain.log 2>&1 &
BRAIN_PID=$!
cd ..
sleep 2

# Start iMessage Bridge
echo "Starting iMessage Bridge (port 3000)..."
cd imessage-bridge
TARGET_CHAT_ID="+14458005280" bun run src/index-db.ts > /tmp/moji-bridge.log 2>&1 &
BRIDGE_PID=$!
cd ..
sleep 2

# Start Desktop UI
echo "Starting Desktop UI (port 5173)..."
cd desktop-app
npm run dev > /tmp/moji-ui.log 2>&1 &
UI_PID=$!
cd ..
sleep 3

echo ""
echo "✅ Moji System Started!"
echo ""
echo "Services:"
echo "  🧠 Pet Brain:     http://localhost:3001"
echo "  🌉 Bridge:        http://localhost:3000"
echo "  🖥️  Desktop UI:    http://localhost:5173"
echo ""
echo "Logs:"
echo "  tail -f /tmp/moji-brain.log"
echo "  tail -f /tmp/moji-bridge.log"
echo "  tail -f /tmp/moji-ui.log"
echo ""
echo "PIDs:"
echo "  Brain:  $BRAIN_PID"
echo "  Bridge: $BRIDGE_PID"
echo "  UI:     $UI_PID"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for user interrupt
trap "echo ''; echo 'Stopping services...'; kill $BRAIN_PID $BRIDGE_PID $UI_PID 2>/dev/null; exit" INT TERM

# Keep script running
echo "Services are running in the background."
echo "To stop: Press Ctrl+C or run: kill $BRAIN_PID $BRIDGE_PID $UI_PID"
echo ""

# Wait indefinitely (but allow Ctrl+C)
while true; do
  sleep 1
done

