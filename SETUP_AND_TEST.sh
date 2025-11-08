#!/bin/bash

echo "🚀 Moji Production Test Setup"
echo ""

# Check if chat ID provided
if [ -z "$1" ]; then
  echo "❌ Error: Please provide a chat ID"
  echo ""
  echo "Usage: ./SETUP_AND_TEST.sh <chat_id>"
  echo ""
  echo "Available group chats:"
  sqlite3 ~/Library/Messages/chat.db "SELECT chat_identifier FROM chat WHERE chat_identifier LIKE 'chat%' LIMIT 10;" 2>&1
  echo ""
  echo "Example: ./SETUP_AND_TEST.sh chat55023045752223532"
  exit 1
fi

CHAT_ID=$1

echo "📝 Setting up .env files with chat ID: $CHAT_ID"
echo ""

# Update Pet Brain .env
cd pet-brain
if grep -q "TARGET_CHAT_ID=" .env; then
  sed -i '' "s/TARGET_CHAT_ID=.*/TARGET_CHAT_ID=$CHAT_ID/" .env
else
  echo "TARGET_CHAT_ID=$CHAT_ID" >> .env
fi
echo "✅ Updated pet-brain/.env"

# Update iMessage Bridge .env
cd ../imessage-bridge
if [ ! -f .env ]; then
  cat > .env << ENVEOF
PORT=3000
BRAIN_URL=http://localhost:3001
TARGET_CHAT_ID=$CHAT_ID
ENVEOF
else
  if grep -q "TARGET_CHAT_ID=" .env; then
    sed -i '' "s/TARGET_CHAT_ID=.*/TARGET_CHAT_ID=$CHAT_ID/" .env
  else
    echo "TARGET_CHAT_ID=$CHAT_ID" >> .env
  fi
fi
echo "✅ Updated imessage-bridge/.env"

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "🧪 Next steps:"
echo "1. Start Pet Brain (Terminal 1):"
echo "   cd pet-brain && bun run dev"
echo ""
echo "2. Start iMessage Bridge (Terminal 2):"
echo "   cd imessage-bridge && bun run dev"
echo ""
echo "3. Test in iMessage:"
echo "   @moji sticker: a cute cat"
echo "   @moji meme: finals stress"
echo ""
