/**
 * Helper functions to extract message text using AppleScript
 * This is a fallback for when the database text field is empty (common for sent messages)
 */

import { spawn } from "child_process";

/**
 * Get message text from Messages.app using AppleScript
 * This works by finding the message by date/time and chat participant
 */
export async function getMessageTextFromAppleScript(
  chatId: string,
  messageDate: number,
  isFromMe: boolean
): Promise<string | null> {
  try {
    // Convert date from nanoseconds since 2001-01-01 to seconds
    const dateSeconds = messageDate / 1000000000;
    const dateObj = new Date(dateSeconds * 1000 + 978307200 * 1000);
    
    // Format date for AppleScript: "Monday, January 1, 2024 at 12:00:00 PM"
    const dateStr = dateObj.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    // Clean phone number for AppleScript (remove + and format)
    const cleanPhone = chatId.replace(/\+/g, "").replace(/\s/g, "");
    
    // AppleScript to get message text
    // Note: This is a simplified approach - finding exact message by date can be tricky
    const appleScript = `
      tell application "Messages"
        set targetChat to null
        set targetService to 1st service whose service type = iMessage
        
        -- Find the chat with this participant
        repeat with aChat in chats of targetService
          try
            set participantsList to participants of aChat
            repeat with aParticipant in participantsList
              set participantId to id of aParticipant
              if participantId contains "${cleanPhone}" or participantId contains "${chatId}" then
                set targetChat to aChat
                exit repeat
              end if
            end repeat
            if targetChat is not null then
              exit repeat
            end if
          end try
        end repeat
        
        if targetChat is not null then
          -- Get messages from this chat
          set chatMessages to messages of targetChat
          -- Return the text of the last message (simplified - could be improved to match by date)
          if (count of chatMessages) > 0 then
            set lastMessage to last item of chatMessages
            return text of lastMessage
          end if
        end if
        return ""
      end tell
    `;

    return new Promise((resolve) => {
      const process = spawn("osascript", ["-e", appleScript]);
      let output = "";
      let error = "";

      process.stdout.on("data", (data) => {
        output += data.toString();
      });

      process.stderr.on("data", (data) => {
        error += data.toString();
      });

      process.on("close", (code) => {
        if (code === 0 && output.trim()) {
          resolve(output.trim());
        } else {
          // AppleScript failed or returned empty - this is expected sometimes
          resolve(null);
        }
      });

      // Timeout after 3 seconds
      setTimeout(() => {
        process.kill();
        resolve(null);
      }, 3000);
    });
  } catch (e) {
    console.error("[AppleScript] Error getting message text:", e);
    return null;
  }
}

/**
 * Simplified version: Get the last message text from a chat
 * This is more reliable than trying to match by exact date
 */
export async function getLastMessageTextFromChat(chatId: string): Promise<string | null> {
  try {
    // Try multiple phone number formats
    const cleanPhone1 = chatId.replace(/\+/g, "").replace(/\s/g, "");
    const cleanPhone2 = chatId.replace(/\+1/, "").replace(/\s/g, ""); // Remove country code
    const cleanPhone3 = chatId.replace(/\D/g, ""); // Only digits
    
    const appleScript = `
      tell application "Messages"
        activate
        set targetChat to null
        set targetService to 1st service whose service type = iMessage
        
        -- Find the chat by participant phone number
        try
          repeat with aChat in chats of targetService
            try
              set participantsList to participants of aChat
              repeat with aParticipant in participantsList
                set participantId to id of aParticipant
                -- Try matching with various phone formats
                if participantId contains "${cleanPhone1}" or participantId contains "${cleanPhone2}" or participantId contains "${cleanPhone3}" or participantId contains "${chatId}" then
                  set targetChat to aChat
                  exit repeat
                end if
              end repeat
              if targetChat is not null then
                exit repeat
              end if
            on error
              -- Skip this chat if there's an error
            end try
          end repeat
        on error errMsg
          return "ERROR: " & errMsg
        end try
        
        if targetChat is not null then
          try
            set chatMessages to messages of targetChat
            set messageCount to count of chatMessages
            if messageCount > 0 then
              -- Get the last few messages and find one from the user (sent)
              set msgIndex to messageCount
              repeat while msgIndex > 0 and msgIndex > (messageCount - 5)
                try
                  set msg to item msgIndex of chatMessages
                  set msgText to text of msg
                  -- Check if this is a sent message (we want the user's messages)
                  -- Return the text if it's not empty
                  if msgText is not "" and msgText is not missing value then
                    return msgText
                  end if
                on error
                  -- Skip this message
                end try
                set msgIndex to msgIndex - 1
              end repeat
              
              -- If no sent message found, return the last message anyway
              set lastMsg to last item of chatMessages
              set lastMsgText to text of lastMsg
              if lastMsgText is not "" and lastMsgText is not missing value then
                return lastMsgText
              end if
            end if
          on error errMsg
            return "ERROR_GETTING_MESSAGES: " & errMsg
          end try
        end if
        return "NOT_FOUND"
      end tell
    `;

    return new Promise((resolve) => {
      const process = spawn("osascript", ["-e", appleScript]);
      let output = "";
      let error = "";

      process.stdout.on("data", (data) => {
        output += data.toString();
      });

      process.stderr.on("data", (data) => {
        error += data.toString();
        console.log(`[AppleScript] stderr: ${data.toString()}`);
      });

      process.on("close", (code) => {
        const trimmed = output.trim();
        if (code === 0 && trimmed && trimmed !== "" && trimmed !== "NOT_FOUND" && !trimmed.startsWith("ERROR")) {
          resolve(trimmed);
        } else {
          if (error) {
            console.log(`[AppleScript] Error output: ${error}`);
          }
          if (trimmed && trimmed.startsWith("ERROR")) {
            console.log(`[AppleScript] Script error: ${trimmed}`);
          }
          resolve(null);
        }
      });

      setTimeout(() => {
        process.kill();
        resolve(null);
      }, 5000); // Increased timeout to 5 seconds
    });
  } catch (e) {
    console.error("[AppleScript] Exception:", e);
    return null;
  }
}

