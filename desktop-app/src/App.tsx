import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const BRAIN_URL = 'http://localhost:3001';
const BRIDGE_URL = 'http://localhost:3000';
const USER_ID = '+14458005280';
const TARGET_CHAT_ID = '+14458005280';

console.log('[CONFIG] USER_ID:', USER_ID);
console.log('[CONFIG] BRAIN_URL:', BRAIN_URL);

interface PetState {
  petMood: string;
  headline: string;
  lastUtterance?: {
    text: string;
    voiceKind: string;
    voiceDurationHint: string;
    audioMomentToPlay?: { eventId: string; s3Url: string; label: string };
    imageMomentToShow?: { eventId: string; s3Url: string; label: string };
  };
}

function App() {
  const [petState, setPetState] = useState<PetState | null>(null);
  const [recording, setRecording] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [lastUtteranceText, setLastUtteranceText] = useState<string>('');
  const [showCommands, setShowCommands] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Poll pet state
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${BRAIN_URL}/pet/state?userId=${encodeURIComponent(USER_ID)}`);
        const data = await res.json();
        console.log('[POLL] Pet state:', JSON.stringify(data, null, 2));
        console.log('[POLL] Has utterance?', !!data.lastUtterance);
        console.log('[POLL] Utterance text:', data.lastUtterance?.text);
        setPetState(data);
        
        // Play voice if new utterance
        if (data.lastUtterance) {
          console.log('[POLL] Utterance:', data.lastUtterance);
          console.log('[POLL] Last utterance text:', lastUtteranceText);
          console.log('[POLL] New text:', data.lastUtterance.text);
          
          if (data.lastUtterance.text !== lastUtteranceText) {
            console.log('[POLL] ✅ New utterance detected! Playing voice...');
            addDebug(`New utterance: "${data.lastUtterance.text}"`);
            setLastUtteranceText(data.lastUtterance.text);
            playVoice(data.lastUtterance.voiceKind, data.lastUtterance.voiceDurationHint);
          } else {
            console.log('[POLL] Same utterance, skipping');
          }
        }
      } catch (e) {
        console.log('Polling pet state...', e);
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [lastUtteranceText]);

  const addDebug = (msg: string) => {
    setDebugInfo(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const playVoice = (kind: string, duration: string) => {
    const audioPath = `${BRAIN_URL}/audio/${kind}_${duration}.mp3`;
    console.log(`[VOICE] Playing: ${audioPath}`);
    addDebug(`Playing: ${kind}_${duration}`);
    
    setIsSpeaking(true);
    
    if (audioRef.current) {
      audioRef.current.src = audioPath;
      audioRef.current.onended = () => {
        setIsSpeaking(false);
        addDebug('Audio ended');
      };
      audioRef.current.play()
        .then(() => {
          console.log(`[VOICE] ✅ Playing ${kind}_${duration}`);
          addDebug(`✅ Playing ${kind}_${duration}`);
        })
        .catch((e) => {
          console.error('[VOICE] Playback failed:', e);
          addDebug(`❌ Playback failed: ${e.message}`);
          setIsSpeaking(false);
          // Try creating a new audio element as fallback
          const audio = new Audio(audioPath);
          audio.onended = () => setIsSpeaking(false);
          audio.play().catch(err => {
            console.error('[VOICE] Fallback failed:', err);
            addDebug(`❌ Fallback failed: ${err.message}`);
            setIsSpeaking(false);
          });
        });
    }
  };

  const sendMessageToPet = async () => {
    if (!userInput.trim()) return;
    
    try {
      await fetch(`${BRAIN_URL}/events/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: TARGET_CHAT_ID,
          userId: USER_ID,
          text: userInput,
          ts: new Date().toISOString()
        })
      });
      
      setUserInput('');
      console.log('Message sent to pet!');
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  const requestMeme = async (topic: string) => {
    try {
      await fetch(`${BRAIN_URL}/events/meme-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: TARGET_CHAT_ID,
          userId: USER_ID,
          topic
        })
      });
      
      console.log('Meme requested:', topic);
      alert(`🎨 Meme "${topic}" sent to iMessage!`);
    } catch (e) {
      console.error('Meme request failed:', e);
    }
  };

  const requestSticker = async (prompt: string) => {
    try {
      await fetch(`${BRAIN_URL}/events/sticker-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: TARGET_CHAT_ID,
          userId: USER_ID,
          prompt,
          style: 'cute'
        })
      });
      
      console.log('Sticker requested:', prompt);
      alert(`✨ Sticker "${prompt}" sent to iMessage!`);
    } catch (e) {
      console.error('Sticker request failed:', e);
    }
  };

  const sendReactionSticker = async () => {
    try {
      await fetch(`${BRAIN_URL}/events/send-sticker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: TARGET_CHAT_ID,
          userId: USER_ID
        })
      });
      
      console.log('Reaction sticker sent!');
      alert('😂 Reaction sticker sent to iMessage!');
    } catch (e) {
      console.error('Reaction sticker failed:', e);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadAudio(audioBlob);
      };

      mediaRecorder.start();
      setRecording(true);
      
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 30000);
    } catch (e) {
      console.error('Recording failed:', e);
      alert('Microphone access denied or unavailable');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setRecording(false);
    }
  };

  const uploadAudio = async (blob: Blob) => {
    try {
      // Create form data with the audio file
      const formData = new FormData();
      formData.append('file', blob, 'audio.webm');
      
      // Upload to brain, which will send to iMessage
      const response = await fetch(`${BRAIN_URL}/upload/audio?chatId=${TARGET_CHAT_ID}&userId=${USER_ID}`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Audio uploaded and sent to iMessage!');
        alert('🎤 Audio sent to iMessage!');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (e) {
      console.error('Upload failed:', e);
      alert('❌ Failed to send audio');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!selectedImage) return;
    
    try {
      // Create form data with the image file
      const formData = new FormData();
      formData.append('file', selectedImage);
      
      // Upload to brain, which will send to iMessage
      const response = await fetch(`${BRAIN_URL}/upload/image?chatId=${TARGET_CHAT_ID}&userId=${USER_ID}`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Image uploaded and sent to iMessage!');
        alert('📸 Image sent to iMessage!');
        setSelectedImage(null);
        setImagePreview(null);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (e) {
      console.error('Image upload failed:', e);
      alert('❌ Failed to send image');
    }
  };

  // Pet emoji changes based on voice kind (animal responding)
  const voiceKind = petState?.lastUtterance?.voiceKind || 'cat';
  const petMood = petState?.petMood || 'chill';
  
  let petEmoji = '🐱'; // Default cat
  
  if (voiceKind === 'dog') {
    petEmoji = petMood === 'excited' ? '🐶💫' : 
               petMood === 'concerned' ? '🐶😟' :
               petMood === 'sleepy' ? '🐶😴' : '🐶';
  } else if (voiceKind === 'bird') {
    petEmoji = petMood === 'excited' ? '🐦💫' : 
               petMood === 'concerned' ? '🐦😟' :
               petMood === 'sleepy' ? '🐦😴' : '🐦';
  } else {
    // Cat (default)
    petEmoji = petMood === 'excited' ? '🐱💫' : 
               petMood === 'concerned' ? '🐱😟' :
               petMood === 'sleepy' ? '🐱😴' : '🐱';
  }

  return (
    <div className="app">
      {/* Pet at center */}
      <div className="pet-container">
        <div className={`pet-sprite ${isSpeaking ? 'speaking' : ''}`} onClick={() => setShowCommands(!showCommands)}>
          {petEmoji}
        </div>
        {petState?.headline && (
          <div className="pet-headline">{petState.headline}</div>
        )}
        {petState?.lastUtterance && (
          <div className="speech-bubble">
            {isSpeaking && <span className="sound-indicator">🔊 </span>}
            {petState.lastUtterance.text}
          </div>
        )}
      </div>

      {/* Talk to pet */}
      <div className="section talk-section">
        <h3>💬 Talk to Moji</h3>
        <div className="input-group">
          <input
            type="text"
            placeholder="Say something to Moji..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessageToPet()}
          />
          <button onClick={sendMessageToPet}>Send</button>
        </div>
        <p className="hint">Moji will react with voice and text!</p>
      </div>

      {/* Commands grid */}
      <div className="commands-grid">
        {/* Meme Commands */}
        <div className="command-card">
          <div className="command-icon">🎨</div>
          <h4>Generate Meme</h4>
          <input
            type="text"
            placeholder="Topic (e.g., finals stress)"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                requestMeme((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
          <button onClick={(e) => {
            const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
            if (input?.value) {
              requestMeme(input.value);
              input.value = '';
            }
          }}>
            Create Meme
          </button>
          <p className="command-example">@moji meme: finals stress</p>
        </div>

        {/* Sticker Commands */}
        <div className="command-card">
          <div className="command-icon">✨</div>
          <h4>Generate Sticker</h4>
          <input
            type="text"
            placeholder="Description (e.g., cute cat)"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                requestSticker((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
          <button onClick={(e) => {
            const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
            if (input?.value) {
              requestSticker(input.value);
              input.value = '';
            }
          }}>
            Create Sticker
          </button>
          <p className="command-example">@moji sticker: cute cat</p>
        </div>

        {/* Reaction Sticker */}
        <div className="command-card">
          <div className="command-icon">😂</div>
          <h4>React to Last Message</h4>
          <p className="description">Send a meme reacting to the previous message</p>
          <button onClick={sendReactionSticker}>
            Send Reaction
          </button>
          <p className="command-example">@moji send sticker</p>
        </div>

        {/* Share Audio Moment */}
        <div className="command-card">
          <div className="command-icon">🎤</div>
          <h4>Share Audio Moment</h4>
          <p className="description">Record and share a voice note</p>
          {!recording ? (
            <button onClick={startRecording}>Start Recording</button>
          ) : (
            <button onClick={stopRecording} className="recording">
              ⏹️ Stop Recording
            </button>
          )}
          <p className="command-example">@moji share moment</p>
        </div>

        {/* Share Image Moment */}
        <div className="command-card">
          <div className="command-icon">📸</div>
          <h4>Share Image Moment</h4>
          <p className="description">Upload and share a photo</p>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
          <button onClick={() => fileInputRef.current?.click()}>
            Choose Photo
          </button>
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Preview" />
              <button onClick={uploadImage} className="upload-btn">
                Share Image
              </button>
            </div>
          )}
          <p className="command-example">@moji share moment</p>
        </div>
      </div>

      {/* Debug panel */}
      <div className="debug-panel">
        <h4>🐛 Debug Info</h4>
        {debugInfo.length > 0 ? (
          <div className="debug-log">
            {debugInfo.map((msg, i) => (
              <div key={i}>{msg}</div>
            ))}
          </div>
        ) : (
          <div>No activity yet...</div>
        )}
        <div className="debug-state">
          <strong>Utterance:</strong> {petState?.lastUtterance?.text || 'None'}
        </div>
      </div>

      {/* Command reference (collapsible) */}
      {showCommands && (
        <div className="command-reference">
          <h3>📚 Available Commands</h3>
          <ul>
            <li><code>@moji meme: [topic]</code> - Generate a meme</li>
            <li><code>@moji sticker: [description]</code> - Generate a sticker (DALL-E)</li>
            <li><code>@moji send sticker</code> - React to last message</li>
            <li><code>@moji share moment</code> - Share audio/image</li>
            <li><code>moji meme: [topic]</code> - Alternative meme command</li>
          </ul>
        </div>
      )}

      {/* Hidden audio player for pet voice */}
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* Moments display */}
      {petState?.lastUtterance?.audioMomentToPlay && (
        <div className="now-playing">
          🎵 Now playing: {petState.lastUtterance.audioMomentToPlay.label}
          <audio src={petState.lastUtterance.audioMomentToPlay.s3Url} autoPlay />
        </div>
      )}

      {petState?.lastUtterance?.imageMomentToShow && (
        <div className="image-moment">
          <img src={petState.lastUtterance.imageMomentToShow.s3Url} alt="Shared moment" />
          <p>{petState.lastUtterance.imageMomentToShow.label}</p>
        </div>
      )}
    </div>
  );
}

export default App;
