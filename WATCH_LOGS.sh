#!/bin/bash

echo "👀 Watching Moji Service Logs..."
echo "Press Ctrl+C to stop"
echo ""

# Watch both log files
tail -f /tmp/moji-brain.log /tmp/moji-bridge.log 2>/dev/null | while read line; do
  # Color code by service
  if echo "$line" | grep -q "moji-brain"; then
    echo -e "\033[34m[Brain]\033[0m $line"
  elif echo "$line" | grep -q "moji-bridge"; then
    echo -e "\033[35m[Bridge]\033[0m $line"
  else
    # Try to detect service from content
    if echo "$line" | grep -qE "(MEME|STICKER|TICK|MOOD|MSG)"; then
      echo -e "\033[34m[Brain]\033[0m $line"
    elif echo "$line" | grep -qE "(iMessage|STICKER REQ|MEME REQ)"; then
      echo -e "\033[35m[Bridge]\033[0m $line"
    else
      echo "$line"
    fi
  fi
done

