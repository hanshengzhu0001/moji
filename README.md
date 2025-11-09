# 🐱 Moji - Your AI Pet for iMessage

> An intelligent AI pet that lives in your iMessage, powered by Photon AI, OpenAI, and ElevenLabs.

![Moji Demo](https://img.shields.io/badge/Status-Complete-success)
![Platform](https://img.shields.io/badge/Platform-macOS-blue)
![HackPrinceton](https://img.shields.io/badge/Built%20at-HackPrinceton%202025-purple)

---

## 🎯 What is Moji?

Moji is an AI-powered digital pet that seamlessly integrates with iMessage. It transforms everyday messaging into an interactive, emotionally intelligent experience by:

- 🎨 **Generating contextual memes** using 100+ Imgflip templates
- ✨ **Creating custom stickers** with OpenAI DALL-E 3
- 😂 **Reacting intelligently** to messages with appropriate memes
- 🎤 **Receiving voice notes** (auto-converts WebM → MP3)
- 📸 **Sharing images** directly to iMessage
- 🧠 **Understanding emotions** with intelligent mood classification
- 🐱🐶🐦 **Responding with animal sounds** - actual meows, barks, and chirps!
- 🎭 **Transforming appearance** - Pet morphs into different animals based on mood
- 🖥️ **Beautiful desktop UI** with real-time voice feedback

---

## ✨ Key Features

### 1. 🎨 Smart Meme Generation
Generate memes with simple commands. Our intelligent system selects the perfect template and generates contextual text.

**Commands:**
```
@moji meme: finals stress
@moji share a meme about coffee
moji meme: hackathon vibes
```

### 2. ✨ Custom Stickers (DALL-E 3)
Create unique, high-quality stickers from natural language descriptions.

**Commands:**
```
@moji sticker: cute cat studying
@moji make a sticker of a happy dog
```

### 3. 😂 Intelligent Reactions
Automatically analyze messages and respond with contextual memes.

**Command:**
```
@moji send sticker
```

### 4. 🎤 Voice Messages
Record audio in the browser, automatically convert to MP3, and send to iMessage.

**Process:**
- Record → Convert (WebM → MP3) → Send to iMessage

### 5. 📸 Image Sharing
Upload and share images directly to iMessage with drag-and-drop.

### 6. 🐱🐶🐦 Animal Voice Responses
Pet responds with **actual animal sounds** based on your mood:

| Your Mood | Pet Transforms | Sound | Response |
|-----------|----------------|-------|----------|
| **Excited** | 🐱💫 Cat | Meow! | "Yay! That's awesome! 🎉" |
| **Stressed** | 🐶 Dog | Woof! | "Hang in there! 🐱" |
| **Sad** | 🐦 Bird | Chirp! | "Sending hugs 🤗" |
| **Neutral** | 🐱 Cat | Meow! | "Got it!" |

### 7. 🎭 Dynamic Pet Transformation
The pet **morphs into different animals** based on the conversation:
- Send a stressed message → Pet becomes a supportive dog 🐶
- Send a sad message → Pet becomes a comforting bird 🐦
- Send an excited message → Pet becomes an energetic cat 🐱💫

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Desktop UI (React + Vite)                   │
│  • Beautiful animated interface                          │
│  • Real-time voice playback                              │
│  • Dynamic pet transformation                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                Pet Brain (Fastify + Bun)                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Mood Classification System                      │  │
│  │  • Pattern-based mood detection                  │  │
│  │  • Meme template selection                        │  │
│  │  • Reaction decision logic                        │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Content Generation                               │  │
│  │  • Imgflip API - 100+ meme templates             │  │
│  │  • OpenAI DALL-E 3 - Custom stickers             │  │
│  │  • ffmpeg - Audio conversion (WebM → MP3)        │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Animal Voice System                              │  │
│  │  • Cat sounds (meows) - Excited/Neutral          │  │
│  │  • Dog sounds (barks) - Stressed                 │  │
│  │  • Bird sounds (chirps) - Sad                    │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           iMessage Bridge (Photon AI SDK)                │
│  • Database polling (chat.db)                            │
│  • Message sending/receiving                             │
│  • File attachments (images, audio, memes)               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 iMessage (macOS)                         │
│          Native Messages.app integration                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **macOS** (for iMessage integration)
- **Node.js 18+** and **Bun**
- **ffmpeg** (for audio conversion)
- **iMessage** signed in on Mac

### Installation

```bash
# Clone the repository
git clone https://github.com/hanshengzhu0001/moji.git
cd moji

# Install dependencies
cd pet-brain && bun install && cd ..
cd imessage-bridge && bun install && cd ..
cd desktop-app && npm install && cd ..

# Install ffmpeg (for audio conversion)
brew install ffmpeg
```

### Configuration

Create `.env` files (copy from `.env.example`):

**pet-brain/.env:**
```bash
PORT=3001
BRIDGE_URL=http://localhost:3000
TARGET_CHAT_ID=+1234567890  # Your phone number

# Required for meme generation
IMGFLIP_USERNAME=your_username
IMGFLIP_PASSWORD=your_password

# Optional: For custom stickers
OPENAI_API_KEY=sk-...

# Optional: For voice synthesis (not required - we use real animal sounds)
ELEVENLABS_API_KEY=...
```

**imessage-bridge/.env:**
```bash
PORT=3000
BRAIN_URL=http://localhost:3001
TARGET_CHAT_ID=+1234567890
USER_PHONE=+1234567890
```

### Run

```bash
# Start all services
./START_UI.sh

# Or manually in separate terminals:
cd pet-brain && bun run src/index.ts
cd imessage-bridge && TARGET_CHAT_ID="+1234567890" bun run src/index-db.ts
cd desktop-app && npm run dev
```

**Open UI:** http://localhost:5173

---

## 🎮 How to Use

### Desktop UI

1. **Talk to Moji** - Type a message, pet responds with animal sounds
2. **Generate Meme** - Enter topic, sends to iMessage
3. **Create Sticker** - Custom DALL-E generation
4. **React to Message** - One-click reaction to previous message
5. **Record Audio** - Voice notes (auto-converts to MP3)
6. **Share Images** - Drag and drop photos

### iMessage Commands

Send these to your configured chat:

```bash
@moji meme: finals stress          # Generate meme
@moji sticker: cute cat studying   # Custom sticker
@moji send sticker                 # React to last message
moji meme: coffee addiction        # Alternative command
```

---

## 🛠️ Technology Stack

### AI & APIs

| Technology | Purpose | Why We Chose It |
|------------|---------|-----------------|
| **Photon AI iMessage Kit** | iMessage integration | Only reliable way to programmatically access iMessage on macOS |
| **OpenAI DALL-E 3** | Custom sticker generation | Best-in-class image generation for unique, high-quality stickers |
| **ElevenLabs** | Voice synthesis (optional) | High-quality voice generation for enhanced responses |
| **Imgflip API** | Meme templates | 100+ popular meme templates, fast and free |

### Backend & Infrastructure

- **Bun** - Fast JavaScript runtime
- **Fastify** - High-performance web framework
- **SQLite** - Lightweight database for state management
- **ffmpeg** - Audio/video processing (WebM → MP3)
- **TypeScript** - Type safety across the stack

### Frontend

- **React** - UI framework
- **Vite** - Lightning-fast build tool
- **CSS3** - Beautiful animations and gradients

---

## 🎭 How It Works

### Message Flow

1. **You send a message** (via UI or iMessage)
2. **Photon AI Bridge** detects it via database polling
3. **Pet Brain** receives the message
4. **Mood classification system** analyzes your message (sad/stressed/excited/neutral)
5. **Pet responds** with:
   - Text bubble (mood-appropriate message)
   - Animal sound (meow/bark/chirp)
   - Visual transformation (cat/dog/bird emoji)
6. **UI updates** in real-time (3-second polling)

### Meme Generation Flow

1. **Command detected** (`@moji meme: finals stress`)
2. **System analyzes** the topic
3. **Selects template** from 100+ Imgflip templates
4. **Generates text** for top/bottom captions
5. **Imgflip API** creates the meme
6. **Photon SDK** sends to iMessage

### Voice Response System

1. **Message received** → Mood classified
2. **Response generated** based on mood
3. **Animal selected**: Cat (excited), Dog (stressed), Bird (sad)
4. **Sound file played**: Actual animal recordings
5. **Pet transforms**: Emoji changes to match animal
6. **UI updates**: Speech bubble + sound + animation

---

## 📊 Project Statistics

- **4 AI APIs** integrated seamlessly
- **100+ meme templates** available
- **3 animal voices** (cat, dog, bird)
- **4 distinct moods** (excited, stressed, sad, neutral)
- **< 2 seconds** average response time
- **~3,500 lines** of production code
- **48 hours** development time

---

## 🎬 Demo

### Quick Demo Commands

```bash
# In iMessage
@moji meme: finals stress
@moji send sticker
@moji sticker: cute cat studying

# In Desktop UI
Talk to Moji: "I'm so excited!"  → 🐱💫 Meow!
Talk to Moji: "I'm stressed"     → 🐶 Woof!
Talk to Moji: "I'm feeling sad"  → 🐦 Chirp!
```

### What Makes Moji Special

1. **Photon AI** - Solved the "impossible" iMessage integration
2. **Intelligent Mood Detection** - Pattern-based emotion understanding
3. **Animal Transformation** - Pet morphs based on your emotions
4. **Real Animal Sounds** - Actual meows, barks, and chirps
5. **Complete UX** - Voice + text + visual feedback

---

## 🔮 Future Enhancements

- [ ] Multi-user support
- [ ] Custom meme templates
- [ ] Voice-to-text transcription (Whisper)
- [ ] Image captioning (GPT-4 Vision)
- [ ] Pet personality customization
- [ ] Mobile app (React Native)
- [ ] More animal types (fox, rabbit, etc.)
- [ ] Group chat analytics

---

## 📚 Documentation

- **SETUP.md** - Detailed installation guide
- **UI_GUIDE.md** - Desktop UI documentation
- **VIDEO_SCRIPT.md** - Demo presentation script
- **HACKPRINCETON_SUBMISSION.md** - Submission details
- **FINAL_CHECKLIST.md** - Pre-submission checklist

---

## 🐛 Troubleshooting

### Voice not playing?
- Check browser console (F12) for errors
- Verify audio files exist: `ls pet-brain/audio/*.mp3`
- Test audio URL: http://localhost:3001/audio/cat_short.mp3
- Click page first (browsers require user interaction)

### Pet not responding?
- Check if Brain is running: `curl http://localhost:3001/health`
- Check if Bridge is running: `curl http://localhost:3000/health`
- View logs: `tail -f /tmp/moji-brain.log`

### Commands not working?
- Verify chat ID in `.env` files
- Check logs: `tail -f /tmp/moji-bridge.log`
- Ensure iMessage is signed in

---

## 🤝 Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

### APIs & Services

- **Photon AI** - Made iMessage integration possible
- **OpenAI** - DALL-E 3 for custom sticker generation
- **ElevenLabs** - Voice synthesis capabilities
- **Imgflip** - Extensive meme template library

### Built At

**HackPrinceton 2025** - Where innovation meets creativity

---

## 🎯 Awards

Eligible for:
- Best Use of Photon AI ⭐
- Best Use of OpenAI ⭐
- Best Use of ElevenLabs ⭐
- Best Overall Hack ⭐

---

## 📞 Contact

**GitHub:** https://github.com/hanshengzhu0001/moji  
**Demo Video:** [Coming Soon]

Built with ❤️ at HackPrinceton 2025

---

## 🚀 Quick Links

- [Setup Guide](SETUP.md) - Installation instructions
- [UI Guide](UI_GUIDE.md) - Desktop UI documentation
- [Video Script](VIDEO_SCRIPT.md) - Demo presentation
- [Submission Details](HACKPRINCETON_SUBMISSION.md) - For judges

---

## 🎉 Try It Now!

```bash
git clone https://github.com/hanshengzhu0001/moji.git
cd moji
./START_UI.sh
```

Open http://localhost:5173 and start chatting with your AI pet!

**Star ⭐ this repo if you found it helpful!**

---

## 💡 What Makes Moji Unique

1. **Multi-API Orchestration** - 4 AI services working together seamlessly
2. **Emotional Intelligence** - Understands and responds to your feelings
3. **Animal Transformation** - Pet morphs based on context (cat/dog/bird)
4. **Real Animal Sounds** - Actual meows, barks, and chirps
5. **Complete Product** - Not just a demo, but a working system
6. **Beautiful UX** - Voice + text + visual + animation feedback

Moji demonstrates what's possible when you combine multiple AI services into a cohesive, delightful user experience. It's not just about using AI - it's about creating something that feels magical. ✨
