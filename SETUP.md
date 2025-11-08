# 🚀 Moji Setup Guide

## Complete Installation & Configuration

### Step 1: Install All Dependencies

```bash
cd /Users/hanszhu/Desktop/hackprinceton/nori
./setup.sh
```

This installs:
- iMessage Bridge dependencies
- Pet Brain dependencies  
- Desktop App dependencies

---

### Step 2: Find Your Group Chat ID

```bash
sqlite3 ~/Library/Messages/chat.db "SELECT chat_identifier, display_name FROM chat WHERE display_name IS NOT NULL ORDER BY display_name LIMIT 20;"
```

Look for your group chat name and copy its `chat_identifier`.

Example output:
```
chat166363708526724594|My Friend Group
+14458005280|John Doe
```

The group chat starts with `chat` followed by numbers.

---

### Step 3: Configure Services

#### iMessage Bridge

```bash
cd imessage-bridge
cat > .env << 'EOF'
PORT=3000
BRAIN_URL=http://localhost:3001
TARGET_CHAT_ID=YOUR_GROUP_CHAT_ID_HERE
EOF
```

#### Pet Brain

```bash
cd ../pet-brain
cat > .env << 'EOF'
PORT=3001
BRIDGE_URL=http://localhost:3000

# Imgflip (for memes)
IMGFLIP_USERNAME=HansZHU1
IMGFLIP_PASSWORD=@1World1Dream

# OpenAI (for Dedalus Agent - required!)
OPENAI_API_KEY=your_openai_key_here

# Optional: Dedalus hosted service
DEDALUS_API_KEY=

# Optional: AWS S3 for moment storage
AWS_BUCKET_NAME=
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

TARGET_CHAT_ID=YOUR_GROUP_CHAT_ID_HERE
EOF
```

**Replace:**
- `YOUR_GROUP_CHAT_ID_HERE` with your actual chat ID
- `your_openai_key_here` with your OpenAI API key

---

### Step 4: Add Animal Sounds (Optional)

Download free animal sounds from:
- Pixabay: https://pixabay.com/sound-effects/
- Mixkit: https://mixkit.co/free-sound-effects/

Save as:
```
assets/sfx/cat_short.mp3
assets/sfx/cat_medium.mp3
assets/sfx/cat_long.mp3
assets/sfx/dog_short.mp3
assets/sfx/dog_medium.mp3
assets/sfx/dog_long.mp3
assets/sfx/bird_short.mp3
assets/sfx/bird_medium.mp3
assets/sfx/bird_long.mp3
```

Or use placeholders:
```bash
cp /System/Library/Sounds/Ping.aiff assets/sfx/cat_short.mp3
```

---

### Step 5: Grant Full Disk Access

1. Open System Settings → Privacy & Security → Full Disk Access
2. Add Terminal or Cursor
3. Toggle ON
4. **Restart terminal completely**

Verify:
```bash
sqlite3 ~/Library/Messages/chat.db "SELECT COUNT(*) FROM message;"
```
Should show a number, not an error.

---

### Step 6: Run All Services

#### Terminal 1 - Pet Brain
```bash
cd pet-brain
bun run dev
```

Wait for: `🧠 Pet Brain listening on port 3001`

#### Terminal 2 - iMessage Bridge
```bash
cd imessage-bridge
bun run dev
```

Wait for: `🌉 iMessage Bridge listening on port 3000`

#### Terminal 3 - Desktop Pet
```bash
cd desktop-app
npm run dev
```

Opens browser at: `http://localhost:5173`

---

### Step 7: Test!

#### Test Meme Generation

In your group iMessage chat, type:
```
@moji share a meme about finals
```

You should see a meme appear! 🎉

#### Test Desktop Pet

1. Open `http://localhost:5173`
2. See animated pet with speech bubble
3. Click "🎤 Record Audio"
4. Record 5 seconds
5. Click "Stop Recording"
6. Audio uploads successfully!

---

## 🔧 Configuration Reference

### Critical Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `TARGET_CHAT_ID` | Both .env files | Group chat to monitor |
| `IMGFLIP_USERNAME` | pet-brain/.env | Meme generation |
| `IMGFLIP_PASSWORD` | pet-brain/.env | Meme generation |
| `OPENAI_API_KEY` | pet-brain/.env | Dedalus Agent (required!) |

### Optional Variables

| Variable | Purpose |
|----------|---------|
| `DEDALUS_API_KEY` | Hosted Dedalus service |
| `AWS_BUCKET_NAME` | S3 moment storage |
| `AWS_REGION` | S3 region |
| `AWS_ACCESS_KEY_ID` | S3 credentials |
| `AWS_SECRET_ACCESS_KEY` | S3 credentials |

---

## 📊 System Architecture

```
Group iMessage Chat
       ↓
iMessage Bridge (Port 3000)
  - Watches chat
  - Detects @moji commands
  - Forwards to Brain
       ↓
Pet Brain (Port 3001)
  - SQLite database
  - Dedalus Agent (OpenAI/Claude)
  - Imgflip meme engine
  - HTTP API
       ↓
Desktop App (Port 5173)
  - Electron + React
  - Polls Brain every 3s
  - Audio recording
  - Meme requests
       ↓
AWS S3 (Optional)
  - Audio/image storage
```

---

## ✅ Health Checks

**Check Pet Brain:**
```bash
curl http://localhost:3001/health
```

**Check iMessage Bridge:**
```bash
curl http://localhost:3000/health
```

**Check Desktop App:**
Open: `http://localhost:5173`

---

## 🎯 Quick Test Checklist

- [ ] All dependencies installed
- [ ] .env files configured
- [ ] Group chat ID found and set
- [ ] Full Disk Access granted
- [ ] Pet Brain running (port 3001)
- [ ] iMessage Bridge running (port 3000)
- [ ] Desktop app open (port 5173)
- [ ] Test meme: `@moji meme: finals` in chat
- [ ] See meme appear in group!

---

**Total setup time: ~10 minutes**

Ready for your hackathon demo! 🚀

