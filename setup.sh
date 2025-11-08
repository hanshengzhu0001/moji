#!/bin/bash
set -e

echo "🐱 Moji - Shared Desktop Pet Setup"
echo "==================================="
echo ""

# Check prerequisites
if ! command -v node &> /dev/null && ! command -v bun &> /dev/null; then
  echo "❌ Node.js or Bun required"
  exit 1
fi

if ! command -v sqlite3 &> /dev/null; then
  echo "❌ sqlite3 required"
  exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."

echo "  → iMessage Bridge..."
cd imessage-bridge
bun install || npm install
cd ..

echo "  → Pet Brain..."
cd pet-brain
bun install || npm install
cd ..

echo "  → Desktop App..."
cd desktop-app
npm install
cd ..

echo ""
echo "✅ Dependencies installed!"
echo ""

# Find group chats
echo "📱 Finding your group chats..."
echo ""
sqlite3 ~/Library/Messages/chat.db "SELECT chat_identifier, display_name FROM chat WHERE display_name IS NOT NULL ORDER BY display_name LIMIT 10;" 2>/dev/null || echo "⚠️  Could not access Messages database. Grant Full Disk Access first!"

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy the chat_identifier for your group chat"
echo "2. Create .env files in imessage-bridge/ and pet-brain/"
echo "3. Add your chat ID and Imgflip credentials"
echo "4. Run the services (see QUICKSTART.md)"
echo ""
echo "See QUICKSTART.md for detailed instructions!"


