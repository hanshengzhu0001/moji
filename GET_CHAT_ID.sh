#!/bin/bash
echo "🔍 Finding your iMessage chats..."
echo ""
sqlite3 ~/Library/Messages/chat.db "SELECT chat_identifier, display_name FROM chat WHERE display_name IS NOT NULL ORDER BY display_name LIMIT 20;" 2>&1
echo ""
echo "📝 Look for your group chat above"
echo "   Group chats start with 'chat' followed by numbers"
echo "   Copy the chat_identifier and add it to .env files"
