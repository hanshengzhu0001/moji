# 🐱 Moji - Project Details

## Inspiration

We were inspired by the challenge of making iMessage more interactive and emotionally engaging. Text messaging can feel cold and impersonal, especially when you're stressed, sad, or just need a pick-me-up. We wanted to create something that would:

- **Bring emotion to messaging**: Transform everyday conversations into interactive experiences
- **Solve the "impossible" problem**: iMessage integration on macOS is notoriously difficult - we wanted to prove it was possible
- **Combine multiple AI services**: Showcase how different AI technologies can work together seamlessly
- **Create a delightful UX**: Build something that's not just functional, but genuinely fun to use

The idea of a pet that transforms into different animals based on your emotions came from the observation that people often anthropomorphize technology and form emotional connections with digital assistants. We wanted to take that a step further with a pet that actually *responds* to your feelings.

---

## What it does

Moji is an AI-powered digital pet that lives in your iMessage, transforming your messaging experience into an interactive, emotionally intelligent companion.

### Core Features

1. **🎭 Emotional Intelligence**
   - Analyzes your messages to detect mood (excited, stressed, sad, neutral)
   - Responds with appropriate emotional support and encouragement
   - Transforms into different animals based on your emotional state

2. **🐱🐶🐦 Animal Transformation**
   - **Cat** (🐱) - Appears when you're excited or neutral
   - **Dog** (🐶) - Appears when you're stressed or need support
   - **Bird** (🐦) - Appears when you're sad and need comfort
   - Pet literally morphs its emoji appearance in real-time

3. **🎤 Voice Responses (ElevenLabs)**
   - Generates natural animal voices using ElevenLabs text-to-speech
   - Creates realistic cat, dog, and bird voices on-demand
   - Voices match the pet's current animal form
   - Plays automatically in the desktop UI

4. **🎨 Meme Generation**
   - Generates contextual memes using 100+ Imgflip templates
   - Command: `@moji meme: finals stress`
   - Intelligently selects templates and generates captions
   - Sends memes directly to iMessage

5. **✨ Custom Stickers (DALL-E 3)**
   - Creates unique, high-quality stickers from natural language
   - Command: `@moji sticker: cute cat studying`
   - Powered by OpenAI DALL-E 3
   - Generates custom artwork on-demand

6. **😂 Reaction Stickers**
   - Reacts to your messages with contextual memes
   - Command: `@moji send sticker`
   - Analyzes conversation context to select appropriate reactions

7. **🎤 Voice Notes**
   - Record audio in the browser
   - Auto-converts WebM → MP3 using ffmpeg
   - Sends voice notes directly to iMessage

8. **📸 Image Sharing**
   - Upload and share images from desktop UI
   - Drag-and-drop interface
   - Sends images directly to iMessage

9. **🖥️ Beautiful Desktop UI**
   - Real-time pet state updates
   - Animated pet sprite with speaking animations
   - Speech bubbles with pet responses
   - Debug panel for monitoring
   - Voice playback with visual indicators

### User Experience

- **In iMessage**: Send commands like `@moji meme: finals stress` and receive memes/stickers
- **In Desktop UI**: Interact with Moji, see pet transformations, hear voice responses
- **Real-time updates**: Pet state syncs every 3 seconds
- **Emotional responses**: Pet adapts to your mood and responds accordingly

---

## Built with

### Quick List (for Devpost)
**TypeScript, JavaScript, React, Fastify, Bun, Node.js, SQLite, Photon AI, OpenAI DALL-E 3, ElevenLabs, Imgflip API, ffmpeg, macOS, Vite**

### Detailed Breakdown

#### Languages
- **TypeScript** - Type-safe JavaScript for all backend and frontend code
- **JavaScript** - Runtime language
- **SQL** - Database queries

#### Frameworks & Libraries
- **React** - UI framework for desktop application
- **Fastify** - High-performance web framework for backend services
- **Vite** - Build tool and development server
- **Bun** - Fast JavaScript runtime for backend services

#### Platforms
- **macOS** - Operating system (required for iMessage integration)
- **Node.js** - JavaScript runtime environment
- **Browser** - Chrome/Firefox/Safari for desktop UI

#### APIs & Services
- **Photon AI iMessage Kit** - iMessage integration and message handling
- **OpenAI DALL-E 3** - Custom sticker generation from text prompts
- **ElevenLabs** - Natural animal voice synthesis (text-to-speech)
- **Imgflip API** - Meme template library (100+ templates)

#### Databases
- **SQLite** - Lightweight database for state management, message storage, and user data

#### Tools & Utilities
- **ffmpeg** - Audio/video processing (WebM to MP3 conversion)
- **Git** - Version control
- **npm** - Package management for Node.js
- **Bun** - Package management and runtime

#### Cloud Services (Optional)
- **AWS S3** - Optional cloud storage for audio files (if configured)

#### Development Tools
- **VS Code** - Code editor
- **Chrome DevTools** - Browser debugging
- **Postman/curl** - API testing

---

## How we built it

### Architecture

We built Moji as a three-service architecture:

```
Desktop UI (React + Vite)
    ↓
Pet Brain (Fastify + Bun + SQLite)
    ↓
iMessage Bridge (Photon AI SDK)
    ↓
iMessage (macOS Messages.app)
```

### Technology Stack

#### Backend
- **Bun** - Fast JavaScript runtime for backend services
- **Fastify** - High-performance web framework
- **SQLite** - Lightweight database for state management
- **TypeScript** - Type safety across the stack

#### Frontend
- **React** - UI framework for desktop app
- **Vite** - Lightning-fast build tool
- **CSS3** - Beautiful animations and gradients

#### AI & APIs
- **Photon AI iMessage Kit** - iMessage integration via database polling
- **OpenAI DALL-E 3** - Custom sticker generation
- **ElevenLabs** - Natural animal voice synthesis (cat, dog, bird voices)
- **Imgflip API** - 100+ meme templates

#### Infrastructure
- **ffmpeg** - Audio/video processing (WebM → MP3 conversion)
- **Node.js** - Runtime for desktop app

### Implementation Details

#### 1. iMessage Bridge (`imessage-bridge/`)
- **Database Polling**: Directly queries macOS `chat.db` SQLite database
- **Message Detection**: Polls for new messages every few seconds
- **Command Parsing**: Detects `@moji` commands and routes to appropriate handlers
- **Message Sending**: Uses Photon AI SDK to send messages, images, and audio files

#### 2. Pet Brain (`pet-brain/`)
- **Mood Classification**: Pattern-based emotion detection (sad, stressed, excited, neutral)
- **Voice Generation**: Integrates with ElevenLabs API to generate animal voices
- **Meme Generation**: Selects templates from Imgflip and generates captions
- **Sticker Generation**: Calls OpenAI DALL-E 3 API for custom stickers
- **State Management**: Stores user data, messages, and utterances in SQLite
- **Audio Processing**: Converts WebM to MP3 using ffmpeg
- **File Uploads**: Handles audio and image uploads from desktop UI

#### 3. Desktop UI (`desktop-app/`)
- **Real-time Polling**: Fetches pet state every 3 seconds
- **Voice Playback**: Plays animal voices from Pet Brain
- **Audio Recording**: Records audio in browser, uploads to Pet Brain
- **Image Upload**: Handles image file selection and upload
- **Visual Feedback**: Animated pet sprite, speech bubbles, debug panel
- **User Interaction**: Handles first-click audio enablement (browser autoplay policy)

### Key Implementation Challenges Solved

1. **iMessage Integration**: Used Photon AI SDK with database polling to access iMessage
2. **Audio Autoplay**: Implemented user interaction tracking to enable audio playback
3. **Voice Synthesis**: Integrated ElevenLabs API with animal voice IDs
4. **File Handling**: Implemented WebM → MP3 conversion with ffmpeg
5. **State Synchronization**: Real-time pet state updates between services
6. **Mood Detection**: Pattern-based emotion classification system

### Development Process

1. **Week 1**: Research and prototyping
   - Investigated iMessage integration options
   - Tested Photon AI SDK
   - Prototyped mood classification system

2. **Week 2**: Core development
   - Built iMessage Bridge with database polling
   - Implemented Pet Brain with mood classification
   - Created meme and sticker generation systems

3. **Week 3**: Voice integration
   - Integrated ElevenLabs API
   - Implemented voice generation and playback
   - Added animal transformation logic

4. **Week 4**: UI and polish
   - Built desktop UI with React
   - Added animations and visual feedback
   - Implemented audio recording and image upload
   - Fixed browser autoplay issues

---

## Challenges we ran into

### 1. iMessage Integration
**Challenge**: iMessage on macOS has no public API. Apple doesn't provide official ways to programmatically access iMessage.

**Solution**: 
- Used Photon AI SDK which provides iMessage access through database polling
- Directly queried macOS `chat.db` SQLite database
- Implemented robust message detection and parsing
- Handled edge cases like message deduplication and timestamp conversion

### 2. Browser Audio Autoplay Policy
**Challenge**: Browsers block audio autoplay until user interaction, preventing automatic voice playback.

**Solution**:
- Implemented user interaction tracking
- Queued audio until first user click
- Added visual indicators ("Click anywhere to enable Moji's voice!")
- Played queued audio after user interaction

### 3. Voice Synthesis Integration
**Challenge**: Integrating ElevenLabs API and generating natural animal voices.

**Solution**:
- Researched ElevenLabs voice IDs for animal-like voices
- Implemented voice generation based on mood and animal type
- Added fallback to pre-recorded audio files
- Handled API rate limits and error cases

### 4. Audio Format Conversion
**Challenge**: Browser records audio as WebM, but iMessage prefers MP3.

**Solution**:
- Integrated ffmpeg for audio conversion
- Implemented WebM → MP3 conversion pipeline
- Added fallback to WebM if conversion fails
- Handled file size calculations and duration estimates

### 5. Real-time State Synchronization
**Challenge**: Keeping desktop UI in sync with Pet Brain state.

**Solution**:
- Implemented polling mechanism (3-second intervals)
- Added state comparison to detect changes
- Implemented voice playback triggers on new utterances
- Added visual feedback for state changes

### 6. Message Deduplication
**Challenge**: Preventing duplicate processing of the same message.

**Solution**:
- Implemented message ID tracking
- Used `processedMessages` Set to track processed messages
- Added timestamp-based filtering
- Handled edge cases like message updates

### 7. Mood Classification
**Challenge**: Detecting user emotions from text messages accurately.

**Solution**:
- Implemented pattern-based classification system
- Created regex patterns for different emotions
- Prioritized specific emotions (sad before stressed)
- Added fallback to neutral mood

### 8. File Upload Handling
**Challenge**: Handling file uploads from desktop UI and sending to iMessage.

**Solution**:
- Implemented multipart form data handling
- Added file validation and size checks
- Integrated with Photon AI SDK for file sending
- Added error handling and user feedback

---

## Accomplishments that we're proud of

### 1. **Solved the "Impossible" iMessage Integration**
We successfully integrated with iMessage on macOS using Photon AI SDK, something that many developers consider nearly impossible. We built a robust system that can send and receive messages, images, and audio files.

### 2. **Multi-API Orchestration**
We seamlessly integrated 4 different AI services:
- **Photon AI** - iMessage integration
- **OpenAI DALL-E 3** - Custom sticker generation
- **ElevenLabs** - Natural animal voice synthesis
- **Imgflip** - Meme template library

### 3. **Emotional Intelligence System**
We built a mood classification system that accurately detects user emotions and responds appropriately. The pet transforms into different animals based on your mood, creating a unique emotional connection.

### 4. **Real Animal Voice Synthesis**
We integrated ElevenLabs to generate natural animal voices on-demand. The pet responds with realistic cat, dog, and bird voices that match its current form.

### 5. **Beautiful Desktop UI**
We created a polished desktop UI with:
- Real-time pet state updates
- Animated pet sprite
- Speech bubbles
- Voice playback
- Audio recording
- Image upload

### 6. **Complete Product**
We built a complete, working system - not just a demo. Every feature works end-to-end:
- Message detection → Mood classification → Voice generation → UI updates
- Meme generation → Template selection → Caption generation → iMessage sending
- Sticker generation → DALL-E 3 API → Image generation → iMessage sending

### 7. **Technical Excellence**
- **Type-safe codebase** - Full TypeScript implementation
- **Error handling** - Robust error handling throughout
- **Performance** - Optimized polling and state management
- **User experience** - Smooth animations and visual feedback

### 8. **Documentation**
We created comprehensive documentation:
- Detailed README with setup instructions
- Architecture diagrams
- API documentation
- Troubleshooting guides
- Video script for demo

---

## What we learned

### Technical Learnings

1. **iMessage Integration**
   - Learned about macOS `chat.db` database structure
   - Understood Photon AI SDK capabilities and limitations
   - Discovered challenges with message timestamp conversion
   - Learned about message deduplication strategies

2. **Voice Synthesis**
   - Explored ElevenLabs API capabilities
   - Learned about voice ID selection and customization
   - Understood audio format requirements
   - Discovered browser autoplay policy limitations

3. **Audio Processing**
   - Learned about WebM and MP3 formats
   - Understood ffmpeg conversion pipeline
   - Discovered file size and duration estimation techniques
   - Learned about audio buffer handling

4. **State Management**
   - Learned about real-time state synchronization
   - Understood polling vs. WebSocket trade-offs
   - Discovered state comparison techniques
   - Learned about UI update optimization

5. **API Integration**
   - Learned about rate limiting and error handling
   - Understood API authentication and key management
   - Discovered best practices for API calls
   - Learned about fallback strategies

### Non-Technical Learnings

1. **User Experience**
   - Learned about emotional design and user connection
   - Understood importance of visual feedback
   - Discovered value of animations and transitions
   - Learned about accessibility considerations

2. **Project Management**
   - Learned about breaking down complex problems
   - Understood importance of incremental development
   - Discovered value of testing and iteration
   - Learned about time management in hackathons

3. **Team Collaboration**
   - Learned about code organization and structure
   - Understood importance of documentation
   - Discovered value of clear communication
   - Learned about version control best practices

4. **Problem Solving**
   - Learned about researching solutions
   - Understood importance of trying multiple approaches
   - Discovered value of persistence and debugging
   - Learned about asking for help when needed

---

## What's next for Moji

### Short-term Enhancements

1. **Multi-User Support**
   - Support multiple users in the same chat
   - Track individual user moods and preferences
   - Personalized responses per user

2. **More Animal Types**
   - Add more animals (fox, rabbit, penguin, etc.)
   - More diverse emotional responses
   - Custom animal selection

3. **Voice Customization**
   - Allow users to customize animal voices
   - Support for different voice styles
   - Voice pitch and speed adjustment

4. **Enhanced Mood Detection**
   - Improve mood classification accuracy
   - Support for more emotions (angry, happy, anxious, etc.)
   - Context-aware mood detection

5. **Better Meme Generation**
   - More meme templates
   - Smarter template selection
   - Custom meme creation

### Medium-term Goals

1. **Mobile App**
   - React Native mobile app
   - iOS and Android support
   - Push notifications

2. **Group Chat Support**
   - Support for group iMessage chats
   - Multi-user interactions
   - Group mood analytics

3. **Voice-to-Text**
   - Whisper API integration
   - Voice message transcription
   - Better voice note handling

4. **Image Analysis**
   - GPT-4 Vision integration
   - Image captioning
   - Visual mood detection

5. **Pet Personality**
   - Customizable pet personalities
   - Learning user preferences
   - Adaptive responses

### Long-term Vision

1. **AI Agent Enhancement**
   - More sophisticated AI decision-making
   - Long-term memory
   - Contextual conversations

2. **Social Features**
   - Share pet moments with friends
   - Pet competitions
   - Social mood tracking

3. **Analytics Dashboard**
   - Mood trends over time
   - Conversation analytics
   - Pet interaction statistics

4. **Monetization**
   - Premium features
   - Custom animal packs
   - Advanced voice options

5. **Open Source**
   - Open source the project
   - Community contributions
   - Plugin system

### Technical Improvements

1. **Performance Optimization**
   - Reduce polling frequency
   - Implement WebSocket connections
   - Optimize database queries

2. **Scalability**
   - Support for more users
   - Distributed architecture
   - Cloud deployment

3. **Reliability**
   - Better error handling
   - Automatic recovery
   - Health monitoring

4. **Security**
   - End-to-end encryption
   - Secure API key storage
   - Privacy controls

5. **Testing**
   - Unit tests
   - Integration tests
   - End-to-end tests

---

## Conclusion

Moji represents a successful integration of multiple AI services into a cohesive, delightful user experience. We're proud of what we built and excited about the future possibilities. The project demonstrates the power of combining different technologies to create something truly unique and engaging.

**Built with ❤️ at HackPrinceton 2025**

