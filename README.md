# 🐱 Moji – Shared Desktop Pet

**One-liner:** Moji is a shared desktop pet for friend groups that lives on your Macs, watches your group iMessage chat, tracks everyone's mood, lets you share audio/image "moments", speaks with animal sounds, and drops contextual memes on request.

## 🎯 Concept + Impact

### Mental Health & Social Glue
Moji nudges friends to celebrate wins and check in during rough patches—without pretending to be a therapist. It's a "social glue" agent that amplifies positive moments and provides gentle emotional support.

### Hybrid Memory for Friend Groups
Instead of disappearing messages, you get a lightweight shared memory of audio clips and images that the pet can surface at the right moment.

### Hybrid Intelligence Demo
Humans live their normal lives while Moji:
- Quietly watches context
- Coordinates across channels (desktop + iMessage)
- Acts with taste (only when appropriate)

### Scalability & Ecosystem
Using **Dedalus' MCP gateway + OpenAI** means the same pattern could plug into future tools (calendar, docs, Spotify) without re-architecting.

---

## 🏗️ Architecture

```
┌──────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   iMessage   │────────>│  iMessage Bridge │────────>│   Pet Brain     │
│  Group Chat  │<────────│   (Node/Bun)     │<────────│  + Dedalus Agent│
└──────────────┘         └──────────────────┘         └─────────────────┘
                                                              │
                                                              ↓
                                                       ┌─────────────┐
                                                       │  Desktop    │
                                                       │  Pet App    │
                                                       │  (Electron) │
                                                       └─────────────┘
                                                              │
                                                              ↓
                                                       ┌─────────────┐
                                                       │   AWS S3    │
                                                       │  (Moments)  │
                                                       └─────────────┘
```

### Components

1. **iMessage Bridge** (Port 3000)
   - Watches ONE group chat via `@photon-ai/imessage-kit`
   - Detects `@moji` commands
   - Forwards messages to Pet Brain
   - Posts responses back to group

2. **Pet Brain** (Port 3001)
   - SQLite database (users, moods, moments, utterances)
   - **Dedalus Agent** with OpenAI/Claude (via MCP gateway)
   - Imgflip meme engine
   - HTTP API for bridge + desktop

3. **Desktop Pet** (Electron + React)
   - Floating animated pet
   - Speech bubbles + animal sounds
   - Audio/image recording & sharing
   - Meme request UI

4. **AWS S3** (Optional)
   - Stores shared moments
   - Presigned URLs for uploads

---

## 🚀 Quick Start

### Prerequisites
- macOS with Full Disk Access
- Node.js 20+ or Bun
- Imgflip account
- OpenAI API key (for Dedalus/Agent)
- Optional: AWS S3 bucket

### 1. Install

```bash
cd /Users/hanszhu/Desktop/hackprinceton/nori
./setup.sh
```

### 2. Configure

**Find your group chat ID:**
```bash
sqlite3 ~/Library/Messages/chat.db "SELECT chat_identifier, display_name FROM chat WHERE display_name IS NOT NULL LIMIT 20;"
```

**Create .env files:**

`imessage-bridge/.env`:
```
PORT=3000
BRAIN_URL=http://localhost:3001
TARGET_CHAT_ID=your_group_chat_id_here
```

`pet-brain/.env`:
```
PORT=3001
BRIDGE_URL=http://localhost:3000

# Imgflip
IMGFLIP_USERNAME=HansZHU1
IMGFLIP_PASSWORD=@1World1Dream

# OpenAI (for Dedalus Agent)
OPENAI_API_KEY=your_openai_key_here

# Optional: Dedalus API key if using their hosted version
DEDALUS_API_KEY=

# Optional: AWS S3
AWS_BUCKET_NAME=
AWS_REGION=us-east-1

TARGET_CHAT_ID=your_group_chat_id_here
```

### 3. Run

**Terminal 1 - Pet Brain:**
```bash
cd pet-brain && bun run dev
```

**Terminal 2 - iMessage Bridge:**
```bash
cd imessage-bridge && bun run dev
```

**Terminal 3 - Desktop App:**
```bash
cd desktop-app && npm run dev
```

### 4. Test!

In your group chat, type:
```
@moji share a meme about finals
```

Moji will post a contextual meme! 🎉

---

## 🎮 Usage

### Request Meme (from iMessage)
```
@moji share a meme about finals
@moji meme me: cats and exams
nori meme: stress and deadlines
```

### Request Meme (from Desktop)
1. Type topic in "Ask Moji for a meme" field
2. Click "Ask Moji"
3. Meme appears in group chat

### Share Audio Moment
1. Click "🎤 Record Audio"
2. Record up to 30s
3. Click "Stop Recording"
4. Audio uploaded to S3, can be surfaced later by Moji

### Share Image Moment
1. Click "📸 Share Image"
2. Select image file
3. Uploads and stores for later surfacing

---

## 🤖 Dedalus Agent Integration

### How It Works

Moji uses **Dedalus Labs Agents SDK** with OpenAI/Claude models via MCP gateway:

```typescript
// Conceptual usage (actual implementation in agent.ts)
const response = runner.run({
  input: "Classify this user's mood from recent messages",
  model: ["anthropic/claude-3.5-sonnet", "openai/gpt-4"],
  mcp_servers: ["dedalus-labs/web-search"], // Optional
  tools: [getUserMoods, getShareableMoments, enqueueUtterance],
  stream: false
});
```

### Agent Modes

**1. Mood Classification**
- Input: Recent messages from user
- Output: Mood label (stressed, sad, neutral, happy, excited)

**2. Meme Suggestion**
- Input: Topic + user context
- Output: Template hint + caption text

**3. Pet Decision**
- Input: Group summary (moods, moments, XP)
- Output: Action (silent, speak_to_user, broadcast_in_chat)

---

## 📊 Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | TypeScript everywhere |
| iMessage Bridge | Node.js + @photon-ai/imessage-kit + Fastify |
| Pet Brain | Node.js + Fastify + SQLite + **Dedalus Agent** |
| AI/LLM | **OpenAI GPT-4** or Claude via Dedalus MCP |
| Meme Engine | Imgflip API |
| Desktop App | Electron + React + Vite |
| Audio | Web Audio API + MediaRecorder |
| Storage | AWS S3 + presigned URLs |

---

## 🎯 Core Workflows

### Workflow A: Mood & Encouragement

1. Friend sends: "I think I bombed that exam 😭"
2. Bridge → Brain `/events/message`
3. **Dedalus Agent** classifies mood → "stressed"
4. Later, on `/tick`, Agent decides to encourage
5. Pet shows speech bubble: "Take a breath – you've got this!"
6. Plays animal sound

### Workflow B: Meme Request

1. User types in chat: `@moji meme: finals stress`
2. Bridge detects command → `/events/meme-request`
3. **Dedalus Agent** suggests template + captions
4. Brain calls Imgflip → generates meme
5. Bridge posts meme to group chat

### Workflow C: Share Moment

1. User records audio in desktop app
2. Uploads to S3 via presigned URL
3. Brain stores moment metadata
4. Later, **Dedalus Agent** decides to surface it
5. Pet plays audio for relevant user

---

## 📝 API Endpoints

### Pet Brain (Port 3001)

**POST** `/events/message` - Receive message from chat  
**POST** `/events/meme-request` - Generate & post meme  
**POST** `/events/shareable` - Store shared moment  
**GET** `/pet/state?userId=...` - Get pet state for desktop  
**GET/POST** `/user/preferences` - Manage settings  
**POST** `/media/presign` - Get S3 upload URL  
**POST** `/tick` - Periodic decision cycle

### iMessage Bridge (Port 3000)

**POST** `/bridge/say-text` - Send text to chat  
**POST** `/bridge/say-meme` - Send meme to chat  
**GET** `/health` - Health check

---

## 🎓 For HackPrinceton Demo

### Demo Flow (5 min):

1. **Show desktop pet** (floating, animated)
2. **Type in group chat**: `@moji meme: finals stress`
3. **Watch** meme appear in <2 seconds
4. **Record audio** from desktop (5s clip)
5. **Show mood tracking** via speech bubbles
6. **Explain Dedalus integration** (hybrid intelligence)

### Key Talking Points:

- **Social glue**: Helps friends celebrate & support each other
- **Shared memory**: Audio/images that surface at right moments
- **Hybrid intelligence**: Templates for speed + AI for context
- **Privacy-friendly**: Local processing, opt-in sharing
- **Extensible**: Dedalus MCP can add web search, calendar, etc.

---

## 🔧 Configuration

### Required Environment Variables

**Both services need:**
- `TARGET_CHAT_ID` - Your group chat identifier
- `IMGFLIP_USERNAME` / `IMGFLIP_PASSWORD` - For memes
- `OPENAI_API_KEY` - For Dedalus Agent

**Optional:**
- `DEDALUS_API_KEY` - If using Dedalus hosted service
- `AWS_*` credentials - For S3 storage

---

## 🐛 Troubleshooting

**"Cannot access Messages database"**
→ Grant Full Disk Access, restart terminal

**"Bridge not detecting messages"**
→ Verify TARGET_CHAT_ID is correct for your group

**"Memes not generating"**
→ Check Imgflip credentials in pet-brain/.env

**"Agent errors"**
→ Verify OPENAI_API_KEY is set

---

## 🚧 Future Enhancements

- Full Dedalus MCP server integration (web search, calendar)
- Image moment sharing UI
- XP/leveling based on group activity
- Multiple pet personalities
- Custom animal voice recordings
- Multi-group support

---

**Built for HackPrinceton 2025** 🎓  
Bringing friend groups closer with hybrid AI!
