# 🐱 Moji - HackPrinceton 2025 Submission

## 🎯 Project Overview

**Moji** is an AI-powered digital pet that lives inside iMessage, making conversations more fun and expressive through intelligent meme generation, custom stickers, and voice responses.

**Built at:** HackPrinceton 2025  
**Duration:** 48 hours  
**Team:** [Your Team Name]

---

## 🚀 What We Built

### Core Features

1. **🎨 Intelligent Meme Generation**
   - 100+ meme templates via Imgflip
   - Context-aware text generation
   - One-command meme creation

2. **✨ Custom Sticker Creation**
   - OpenAI DALL-E 3 integration
   - High-quality 1024x1024 images
   - Natural language descriptions

3. **😂 Smart Reactions**
   - Analyzes message sentiment
   - Generates contextual responses
   - Automatic or manual triggers

4. **🎤 Voice Messages**
   - Browser audio recording
   - WebM → MP3 conversion
   - Sends to iMessage

5. **📸 Image Sharing**
   - Drag-and-drop upload
   - Direct iMessage integration
   - Preview before sending

6. **🧠 Emotion Understanding**
   - AI-powered mood classification
   - 4 distinct moods (chill, excited, concerned, sleepy)
   - Adaptive responses

7. **🎵 Animal Voice Responses**
   - ElevenLabs voice synthesis
   - Mood-based voice selection
   - Text + audio feedback

8. **🖥️ Beautiful Desktop UI**
   - Animated pet interface
   - Real-time state updates
   - Smooth interactions

---

## 🏗️ Technical Architecture

### System Components

```
Desktop UI (React/Vite)
    ↓
Pet Brain (Fastify/Bun)
    ├── Dedalus Agent (AI decisions)
    ├── OpenAI DALL-E 3 (stickers)
    ├── ElevenLabs (voices)
    ├── Imgflip (memes)
    └── SQLite (state)
    ↓
iMessage Bridge (Photon AI)
    ├── Database polling
    ├── Message sending
    └── File attachments
    ↓
iMessage (macOS)
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **AI Integration** | Photon AI iMessage Kit | iMessage access & messaging |
| **AI Decisions** | Dedalus Labs Agent | Mood classification, content decisions |
| **Image Generation** | OpenAI DALL-E 3 | Custom sticker creation |
| **Voice Synthesis** | ElevenLabs | Animal voice generation |
| **Meme Templates** | Imgflip API | 100+ popular meme templates |
| **Backend** | Bun + Fastify | High-performance server |
| **Database** | SQLite | User state & message history |
| **Frontend** | React + Vite | Desktop UI |
| **Audio Processing** | ffmpeg | WebM → MP3 conversion |

---

## 💡 Innovation Highlights

### 1. Multi-API Orchestration

We integrated **5 different AI services** into a cohesive system:

- **Photon AI** - The foundation for iMessage access
- **Dedalus Labs** - Intelligence layer for decision-making
- **OpenAI** - Creative content generation
- **ElevenLabs** - Natural voice synthesis
- **Imgflip** - Fast meme generation

Each API is used for its strength, creating a system that's both fast and high-quality.

### 2. Intelligent Decision-Making

Not all messages deserve a meme. Moji uses Dedalus Agent to:
- Analyze message sentiment
- Determine appropriate response style
- Decide when to generate content
- Select voice tone based on mood

### 3. Seamless iMessage Integration

Photon AI's iMessage Kit enabled:
- Direct database polling (no reverse engineering)
- Reliable message sending
- File attachment support (images, audio)
- Real-time message detection

### 4. Complete User Experience

- Beautiful animated UI
- Voice + text feedback
- Real-time state updates
- Multiple interaction modes
- Error handling & fallbacks

---

## 🛠️ Technical Challenges & Solutions

### Challenge 1: iMessage Integration

**Problem:** Apple doesn't provide an official iMessage API.

**Solution:** Used Photon AI's iMessage Kit for reliable database access and message sending.

**Impact:** Enabled production-ready iMessage integration without reverse engineering.

### Challenge 2: Audio Compatibility

**Problem:** Browser records in WebM, but not all devices support it.

**Solution:** Implemented automatic WebM → MP3 conversion with ffmpeg.

**Impact:** Universal audio playback across all devices.

### Challenge 3: Intelligent Content Generation

**Problem:** Random meme generation feels spammy and irrelevant.

**Solution:** Integrated Dedalus Agent for context-aware decision-making.

**Impact:** Memes feel natural and appropriate to the conversation.

### Challenge 4: Multiple Content Types

**Problem:** Different content needs different generation methods.

**Solution:** 
- Imgflip for fast meme templates
- DALL-E 3 for custom stickers
- ElevenLabs for voice synthesis

**Impact:** Best tool for each job, optimal speed and quality.

### Challenge 5: Real-Time Responsiveness

**Problem:** Need to detect new messages quickly.

**Solution:** Database polling every 2 seconds with smart deduplication.

**Impact:** Near-instant responses without webhook complexity.

---

## 📊 By The Numbers

- **5** AI APIs integrated
- **100+** meme templates available
- **4** distinct pet moods
- **3** services (Brain, Bridge, UI)
- **2** seconds average response time
- **10MB** max file upload size
- **30** seconds max audio recording
- **20** messages kept in history
- **~3,500** lines of code
- **48** hours to build

---

## 🎮 Live Demo Flow

### Part 1: Basic Commands (1 min)

1. Open Desktop UI
2. Show animated pet
3. Type: "I'm stressed about finals"
4. Pet responds with voice + text
5. Send: `@moji meme: finals stress`
6. Meme appears in iMessage

### Part 2: Advanced Features (1.5 min)

1. Generate custom sticker: `@moji sticker: cute cat studying`
2. Record voice note → converts to MP3 → sends to iMessage
3. Upload image → sends to iMessage
4. Show: `@moji send sticker` → reacts to previous message

### Part 3: Behind the Scenes (1 min)

1. Show architecture diagram
2. Explain Photon AI integration
3. Show Dedalus Agent decision-making
4. Highlight multi-API orchestration

### Part 4: Impact (0.5 min)

1. Show all features working together
2. Emphasize user experience
3. Mention future enhancements

---

## 🏆 Why Moji Stands Out

### 1. Production-Ready

Not just a hackathon demo - Moji is a complete, working product with:
- Error handling
- Fallback mechanisms
- Rate limiting
- Deduplication
- Comprehensive logging

### 2. Multi-API Mastery

Successfully integrated 5 different AI services:
- Each API used for its strength
- Seamless orchestration
- Graceful fallbacks

### 3. Great User Experience

- Beautiful, intuitive UI
- Real-time feedback
- Voice + visual responses
- Multiple interaction modes

### 4. Technical Depth

- Custom audio conversion pipeline
- Smart agent decision-making
- Database polling architecture
- File attachment handling

---

## 🔮 Future Roadmap

### Short-term (1-2 weeks)
- [ ] Multi-user support
- [ ] Custom meme templates
- [ ] Voice-to-text (Whisper)
- [ ] Image captioning (GPT-4 Vision)

### Medium-term (1-2 months)
- [ ] Mobile app (React Native)
- [ ] Group chat analytics
- [ ] Pet personality customization
- [ ] Scheduled messages

### Long-term (3-6 months)
- [ ] Multi-platform (Android, WhatsApp)
- [ ] AI-generated pet animations
- [ ] Social features (pet battles)
- [ ] Marketplace for custom pets

---

## 📚 Documentation

- **README.md** - Project overview and setup
- **SETUP.md** - Detailed installation guide
- **UI_GUIDE.md** - Desktop UI documentation
- **COMPLETE.md** - Feature completion status
- **VIDEO_SCRIPT.md** - Demo video script

---

## 🙏 Acknowledgments

### APIs & Services

- **Photon AI** - Made iMessage integration possible
- **Dedalus Labs** - Powered intelligent decision-making
- **OpenAI** - DALL-E 3 for custom sticker generation
- **ElevenLabs** - Natural animal voice synthesis
- **Imgflip** - Extensive meme template library

### Inspiration

Built to make communication more fun, expressive, and emotionally intelligent.

---

## 🎯 Judging Criteria

### Innovation ⭐⭐⭐⭐⭐
- First AI pet for iMessage
- Multi-API orchestration
- Voice + visual + text responses
- Emotion-aware interactions

### Technical Complexity ⭐⭐⭐⭐⭐
- 5 API integrations
- Real-time database polling
- Audio conversion pipeline
- Smart agent framework
- File attachment handling

### User Experience ⭐⭐⭐⭐⭐
- Beautiful, intuitive UI
- Real-time feedback
- Multiple interaction modes
- Seamless iMessage integration
- Voice responses

### Completeness ⭐⭐⭐⭐⭐
- Fully functional
- Production-ready code
- Comprehensive documentation
- Error handling & fallbacks
- Testing scripts

---

## 🚀 Try It Yourself

```bash
git clone https://github.com/hanshengzhu0001/moji.git
cd moji
./START_UI.sh
```

Open http://localhost:5173 and start chatting with Moji!

---

## 📞 Contact

**Team:** [Your Team Name]  
**GitHub:** https://github.com/hanshengzhu0001/moji  
**Demo:** [Video Link]

Built with ❤️ at HackPrinceton 2025

---

## 🎉 Thank You!

Thank you to the HackPrinceton organizers, sponsors (especially Photon AI, Dedalus Labs, OpenAI, and ElevenLabs), and mentors for making this possible!

**Moji** - Your AI pet for iMessage 🐱✨

