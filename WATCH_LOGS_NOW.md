# 👀 Watch Logs Now - Quick Commands

## 🚀 Quick Start

**Open a new terminal and run:**

```bash
tail -f /tmp/moji-bridge-final.log /tmp/moji-brain.log
```

This will show you **all logs in real-time** from both services.

---

## 📋 All Monitoring Options

### 1. Watch Both Services (Best)
```bash
tail -f /tmp/moji-bridge-final.log /tmp/moji-brain.log
```

### 2. Watch Bridge Only
```bash
tail -f /tmp/moji-bridge-final.log
```

### 3. Watch Pet Brain Only
```bash
tail -f /tmp/moji-brain.log
```

### 4. Filter for Sticker Events
```bash
# Bridge - sticker commands
tail -f /tmp/moji-bridge-final.log | grep -i 'sticker\|iMessage\|POLL'

# Pet Brain - sticker generation
tail -f /tmp/moji-brain.log | grep -i 'sticker\|STICKER'
```

### 5. Use Monitor Script
```bash
cd /Users/hanszhu/Desktop/hackprinceton/moji
./MONITOR_LOGS.sh
```

---

## 🔍 What to Look For

### When You Send: `@moji sticker: a cute cat`

**Bridge logs should show:**
```
[iMessage] <user>: "@moji sticker: a cute cat..."
[STICKER REQ] Prompt: a cute cat with big eyes, Style: cute
```

**Pet Brain logs should show:**
```
[STICKER] Request from <user>: "a cute cat with big eyes" (cute)
[STICKER] Generated sticker: <URL>
[STICKER] ✅ Sent sticker: a cute cat with big eyes
```

---

## 🛑 Stop Monitoring

Press `Ctrl+C` to stop watching logs.

---

## 📊 Check Current Status

```bash
# Quick status check
curl http://localhost:3001/health  # Pet Brain
curl http://localhost:3000/health  # Bridge

# Check if services are running
ps aux | grep "bun.*pet-brain\|bun.*imessage-bridge" | grep -v grep
```

---

**Ready! Run the command above and send your sticker command in iMessage!** 🚀

