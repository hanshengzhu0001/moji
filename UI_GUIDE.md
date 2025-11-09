# 🎨 Moji Desktop UI Guide

## Overview

The Moji Desktop UI is a beautiful, interactive interface for your AI pet that integrates with iMessage. It features:

- **Pet at center** - Animated pet with mood-based expressions
- **Voice responses** - Pet responds with animal voices and text bubbles
- **All @moji commands** - Smoothly integrated UI for every command
- **Share moments** - Record audio and upload images
- **Real-time sync** - Connected to iMessage via Bridge

---

## 🚀 Quick Start

### 1. Start Everything

```bash
cd /Users/hanszhu/Desktop/hackprinceton/moji
./START_UI.sh
```

This starts:
- **Pet Brain** (port 3001) - AI logic, meme generation
- **iMessage Bridge** (port 3000) - iMessage integration  
- **Desktop UI** (port 5173) - Interactive web interface

### 2. Open the UI

Navigate to: **http://localhost:5173**

---

## 🎮 Features

### 💬 Talk to Moji

- Type a message in the "Talk to Moji" input
- Press Enter or click Send
- Moji will respond with:
  - **Text bubble** (speech bubble above pet)
  - **Animal voice** (plays automatically)
  - **Mood changes** (pet emoji changes based on mood)

**Example:**
```
You: "I'm so stressed about finals"
Moji: *plays supportive voice* "Hang in there! 🐱"
```

### 🎨 Generate Meme

- Enter a topic (e.g., "finals stress")
- Click "Create Meme"
- Meme is generated and sent to iMessage

**iMessage command:** `@moji meme: finals stress`

### ✨ Generate Sticker

- Enter a description (e.g., "cute cat studying")
- Click "Create Sticker"
- Custom sticker generated with DALL-E 3

**iMessage command:** `@moji sticker: cute cat studying`

**Note:** Requires `OPENAI_API_KEY` in `.env`

### 😂 React to Last Message

- Click "Send Reaction"
- Generates a meme reacting to the previous message
- Automatically analyzes message context

**iMessage command:** `@moji send sticker`

### 🎤 Share Audio Moment

- Click "Start Recording"
- Speak for up to 30 seconds
- Click "Stop Recording"
- Audio is shared as a moment

**iMessage command:** `@moji share moment` (audio)

### 📸 Share Image Moment

- Click "Choose Photo"
- Select an image from your computer
- Click "Share Image"
- Image is shared as a moment

**iMessage command:** `@moji share moment` (image)

---

## 🎭 Pet Moods

The pet's emoji changes based on mood:

| Mood | Emoji | Triggers |
|------|-------|----------|
| **Chill** | 🐱 | Default, neutral messages |
| **Excited** | 🐱💫 | Happy messages, celebrations |
| **Concerned** | 🐱😟 | Stressed messages, problems |
| **Sleepy** | 🐱😴 | Tired messages, late night |

---

## 📚 All Available Commands

Click the pet to toggle the command reference panel.

### iMessage Commands

1. **`@moji meme: [topic]`**
   - Generate a meme about a topic
   - Example: `@moji meme: finals stress`

2. **`@moji sticker: [description]`**
   - Generate a custom sticker with DALL-E
   - Example: `@moji sticker: cute cat with big eyes`

3. **`@moji send sticker`**
   - React to the previous message with a meme
   - No topic needed, analyzes context automatically

4. **`@moji share moment`**
   - Share audio or image moments
   - Use UI buttons for easier sharing

5. **`moji meme: [topic]`**
   - Alternative meme command (without @)
   - Example: `moji meme: coffee addiction`

---

## 🔧 Configuration

### Environment Variables

Create `.env` files in both `pet-brain/` and `imessage-bridge/`:

**pet-brain/.env:**
```bash
PORT=3001
BRIDGE_URL=http://localhost:3000
TARGET_CHAT_ID=+14458005280
IMGFLIP_USERNAME=your_username
IMGFLIP_PASSWORD=your_password
OPENAI_API_KEY=sk-...  # Optional, for DALL-E stickers
ELEVENLABS_API_KEY=...  # Optional, for better voices
```

**imessage-bridge/.env:**
```bash
PORT=3000
BRAIN_URL=http://localhost:3001
TARGET_CHAT_ID=+14458005280
USER_PHONE=+14458005280
```

### Change Target Chat

To use a different chat:

1. Find your chat ID:
   ```bash
   ./GET_CHAT_ID.sh
   ```

2. Update `TARGET_CHAT_ID` in both `.env` files

3. Restart services:
   ```bash
   ./START_UI.sh
   ```

---

## 🎵 Animal Voices

The pet uses animal voices to respond. Voice files should be in `pet-brain/audio/`:

**Format:** `{animal}_{duration}.mp3`

Examples:
- `cat_short.mp3` - Quick meow
- `dog_medium.mp3` - Friendly bark
- `bird_long.mp3` - Cheerful chirp

**Voice selection:**
- **Excited mood** → High-energy voices
- **Concerned mood** → Gentle, supportive voices
- **Sleepy mood** → Calm, slow voices

---

## 🐛 Troubleshooting

### UI won't load

```bash
cd desktop-app
npm install
npm run dev
```

### Pet not responding

Check if Brain is running:
```bash
curl http://localhost:3001/health
```

### iMessage not working

Check if Bridge is running:
```bash
curl http://localhost:3000/health
```

### Audio not playing

- Check browser console for errors
- Ensure audio files exist in `pet-brain/audio/`
- Try clicking the page first (browsers require user interaction)

### Commands not working

- Verify services are running: `./START_UI.sh`
- Check logs: `tail -f /tmp/moji-*.log`
- Ensure chat ID is correct in `.env`

---

## 📊 Monitoring

### View Logs

```bash
# All logs together
./WATCH_LOGS.sh

# Individual logs
tail -f /tmp/moji-brain.log
tail -f /tmp/moji-bridge.log
tail -f /tmp/moji-ui.log
```

### Check Status

```bash
# Check if services are running
lsof -i:3000  # Bridge
lsof -i:3001  # Brain
lsof -i:5173  # UI
```

---

## 🎨 Customization

### Change Pet Emoji

Edit `desktop-app/src/App.tsx`:

```typescript
const petEmoji = petState?.petMood === 'excited' ? '🦊💫' : 
                 petState?.petMood === 'concerned' ? '🦊😟' :
                 petState?.petMood === 'sleepy' ? '🦊😴' : '🦊';
```

### Change Colors

Edit `desktop-app/src/App.css`:

```css
.app {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* Change to your preferred gradient */
}
```

### Add New Commands

1. Add pattern in `imessage-bridge/src/index-db.ts`
2. Add handler in `pet-brain/src/index.ts`
3. Add UI button in `desktop-app/src/App.tsx`

---

## 🚀 Production Deployment

### Build Desktop App

```bash
cd desktop-app
npm run build
```

This creates a standalone Electron app in `dist/`.

### Deploy Services

Use PM2 or similar to keep services running:

```bash
pm2 start pet-brain/src/index.ts --name moji-brain
pm2 start imessage-bridge/src/index-db.ts --name moji-bridge
pm2 save
```

---

## 📝 Notes

- **Microphone permission** required for audio recording
- **File access** required for image upload
- **iMessage** must be signed in on Mac
- **Database** stored in `pet-brain/nori.db`
- **Logs** stored in `/tmp/moji-*.log`

---

## 🎉 Tips

1. **Click the pet** to show/hide command reference
2. **Press Enter** in any input to submit
3. **Hover over cards** for smooth animations
4. **Check logs** if something doesn't work
5. **Restart services** if behavior is weird

Enjoy your Moji pet! 🐱✨

