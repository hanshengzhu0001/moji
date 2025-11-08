#!/bin/bash

echo "👀 Monitoring Moji Service Logs..."
echo "Press Ctrl+C to stop"
echo ""
echo "Watching:"
echo "  - Bridge: /tmp/moji-bridge-final.log"
echo "  - Pet Brain: /tmp/moji-brain.log"
echo ""

# Use tail -f to watch both log files
tail -f /tmp/moji-bridge-final.log /tmp/moji-brain.log 2>/dev/null

