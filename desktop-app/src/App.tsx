import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const BRAIN_URL = 'http://localhost:3001';
const USER_ID = '+14458005280'; // TODO: Make configurable

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
  const [memeRequest, setMemeRequest] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Poll pet state
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${BRAIN_URL}/pet/state?userId=${USER_ID}`);
        const data = await res.json();
        setPetState(data);
        
        // Play voice if new utterance
        if (data.lastUtterance) {
          playVoice(data.lastUtterance.voiceKind, data.lastUtterance.voiceDurationHint);
        }
      } catch (e) {
        console.error('Failed to poll pet state:', e);
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, []);

  const playVoice = (kind: string, duration: string) => {
    const audio = new Audio(`/assets/sfx/${kind}_${duration}.mp3`);
    audio.play().catch(e => console.error('Audio playback failed:', e));
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
      
      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 30000);
    } catch (e) {
      console.error('Recording failed:', e);
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
      // Get presigned URL
      const presignRes = await fetch(`${BRAIN_URL}/media/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'audio', userId: USER_ID })
      });
      const { uploadUrl, finalUrl } = await presignRes.json();

      // Upload to S3 (or mock)
      await fetch(uploadUrl, {
        method: 'PUT',
        body: blob
      });

      // Register moment
      await fetch(`${BRAIN_URL}/events/shareable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: USER_ID,
          type: 'audio',
          s3Url: finalUrl,
          durationSec: 10,
          shortDesc: 'Voice note from desktop'
        })
      });

      console.log('Audio uploaded!');
    } catch (e) {
      console.error('Upload failed:', e);
    }
  };

  const requestMeme = async () => {
    if (!memeRequest.trim()) return;
    
    try {
      await fetch(`${BRAIN_URL}/events/meme-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: 'default',
          userId: USER_ID,
          topic: memeRequest
        })
      });
      
      setMemeRequest('');
      console.log('Meme requested!');
    } catch (e) {
      console.error('Meme request failed:', e);
    }
  };

  const petEmoji = petState?.petMood === 'excited' ? '🐱💫' : 
                   petState?.petMood === 'concerned' ? '🐱😟' :
                   petState?.petMood === 'sleepy' ? '🐱😴' : '🐱';

  return (
    <div className="app">
      <div className="pet-container">
        <div className="pet-sprite">{petEmoji}</div>
        {petState?.headline && (
          <div className="pet-headline">{petState.headline}</div>
        )}
        {petState?.lastUtterance && (
          <div className="speech-bubble">
            {petState.lastUtterance.text}
          </div>
        )}
      </div>

      <div className="controls">
        <div className="section">
          <h3>Share a Moment</h3>
          {!recording ? (
            <button onClick={startRecording}>🎤 Record Audio</button>
          ) : (
            <button onClick={stopRecording} className="recording">⏹️ Stop Recording</button>
          )}
        </div>

        <div className="section">
          <h3>Request Meme</h3>
          <input
            type="text"
            placeholder="Topic (e.g., finals, deadlines)"
            value={memeRequest}
            onChange={(e) => setMemeRequest(e.target.value)}
          />
          <button onClick={requestMeme}>🎨 Ask Moji</button>
        </div>
      </div>

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


