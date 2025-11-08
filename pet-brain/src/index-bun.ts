import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { Database } from "bun:sqlite";
import { request } from "undici";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { agent } from "./agent";
import { generateAnimalVoice } from "./elevenlabs";
import { generateSticker } from "./sticker";

const PORT = parseInt(process.env.PORT || "3001");
const BRIDGE_URL = process.env.BRIDGE_URL || "http://localhost:3000";
const IMGFLIP_USERNAME = process.env.IMGFLIP_USERNAME!;
const IMGFLIP_PASSWORD = process.env.IMGFLIP_PASSWORD!;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const fastify = Fastify({ logger: true });
await fastify.register(cors, { origin: true });

// SQLite database using Bun's built-in SQLite
const db = new Database("nori.db");

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    displayName TEXT,
    lastMood TEXT DEFAULT 'neutral',
    shareWins INTEGER DEFAULT 1,
    shareAudio INTEGER DEFAULT 1,
    shareImages INTEGER DEFAULT 1,
    shareMemes INTEGER DEFAULT 1,
    askBeforeShare INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS groups (
    groupId TEXT PRIMARY KEY,
    chatId TEXT,
    petMood TEXT DEFAULT 'chill',
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chatId TEXT,
    userId TEXT,
    text TEXT,
    ts TEXT
  );

  CREATE TABLE IF NOT EXISTS moments (
    eventId TEXT PRIMARY KEY,
    groupId TEXT,
    userId TEXT,
    type TEXT,
    s3Url TEXT,
    durationSec INTEGER,
    shortDesc TEXT,
    ts TEXT,
    shareable INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS utterances (
    userId TEXT PRIMARY KEY,
    text TEXT,
    voiceKind TEXT,
    voiceDurationHint TEXT,
    audioMomentId TEXT,
    imageMomentId TEXT,
    ts TEXT
  );
`);

console.log("✅ Database initialized");

// Rest of the file continues with the same endpoints...
// (This is a simplified version - you'd need to convert all better-sqlite3 calls to Bun SQLite)
