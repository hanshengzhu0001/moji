#!/bin/bash

echo "👀 Watching Moji Service Logs..."
echo "Press Ctrl+C to stop"
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Watch both log files
tail -f /tmp/moji-brain.log /tmp/moji-bridge.log 2>/dev/null | while read line; do
  # Color code by service
  if echo "$line" | grep -q "moji-brain\|Pet Brain\|STICKER AUTO\|STICKER DECISION"; then
    echo -e "${BLUE}[Brain]${NC} $line"
  elif echo "$line" | grep -q "moji-bridge\|Bridge\|iMessage\|FORWARD\|DB\]"; then
    echo -e "${GREEN}[Bridge]${NC} $line"
  elif echo "$line" | grep -qE "(STICKER|MEME|MOOD|MSG)"; then
    echo -e "${YELLOW}[Event]${NC} $line"
  else
    echo "$line"
  fi
done
