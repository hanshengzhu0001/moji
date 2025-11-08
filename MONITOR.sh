#!/bin/bash

echo "👀 Monitoring Moji Services - Real-time Logs"
echo "Press Ctrl+C to stop"
echo ""
echo "Services:"
echo "  🧠 Pet-Brain: http://localhost:3001/health"
echo "  🌉 Bridge: http://localhost:3000/health"
echo ""
echo "Log Files:"
echo "  📝 Pet-Brain: /tmp/moji-brain.log"
echo "  📝 Bridge: /tmp/moji-bridge.log"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Watch both log files with color coding
tail -f /tmp/moji-brain.log /tmp/moji-bridge.log 2>/dev/null | while read line; do
  # Color code by service and event type
  if echo "$line" | grep -qE "(STICKER AUTO|STICKER DECISION|Generated meme|Sent.*meme)"; then
    echo -e "${YELLOW}[STICKER]${NC} $line"
  elif echo "$line" | grep -qE "(Pet Brain|STICKER|MEME|meme|TICK)"; then
    echo -e "${BLUE}[Brain]${NC} $line"
  elif echo "$line" | grep -qE "(Bridge|iMessage|FORWARD|DB\]|say-meme)"; then
    echo -e "${GREEN}[Bridge]${NC} $line"
  elif echo "$line" | grep -qE "(ERROR|Error|error|FAILED|Failed)"; then
    echo -e "${RED}[ERROR]${NC} $line"
  else
    echo "$line"
  fi
done

