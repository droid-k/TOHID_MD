const { cmd } = require('../command');
const config = require("../config");

// Initialize warnings globally
if (!global.warnings) {
  global.warnings = {};
}

// Store anti-link mode (default: 'warn')
if (!global.antiLinkMode) {
  global.antiLinkMode = 'delete'; // 'warn' | 'delete' | 'kick'
}

// Command to change anti-link mode
cmd({
  pattern: "antilink",
  desc: "Set anti-link mode (warn/delete/kick)",
  category: "admin",
  isAdmin: true
}, async (conn, m, text) => {
  const mode = text?.toLowerCase().trim();
  
  if (!mode || !['warn', 'delete', 'kick'].includes(mode)) {
    return m.reply(`❌ Invalid mode! Usage: *antilink warn* | *antilink delete* | *antilink kick*`);
  }

  global.antiLinkMode = mode;
  m.reply(`✅ Anti-link mode set to: *${mode}*`);
});

// Main anti-link detection
cmd({
  'on': "body"
}, async (conn, m, store, {
  from,
  body,
  sender,
  isGroup,
  isAdmins,
  isBotAdmins,
  reply
}) => {
  try {
    // Skip if not a group, sender is admin, or bot isn't admin
    if (!isGroup || isAdmins || !isBotAdmins) return;

    const linkPatterns = [
      /https?:\/\/(?:chat\.whatsapp\.com|wa\.me)\/\S+/gi,
      /https?:\/\/(?:api\.whatsapp\.com|wa\.me)\/\S+/gi,
      /wa\.me\/\S+/gi,
      /https?:\/\/(?:t\.me|telegram\.me)\/\S+/gi,
      /https?:\/\/(?:www\.)?\.com\/\S+/gi,
      /https?:\/\/(?:www\.)?(twitter|linkedin|reddit|discord|twitch|vimeo|dailymotion|medium)\.com\/\S+/gi,
      /https?:\/\/youtu\.be\/\S+/gi,
      /https?:\/\/(?:www\.)?(facebook|fb|instagram|tiktok|snapchat|pinterest)\.com\/\S+/gi
    ];

    const containsLink = linkPatterns.some(pattern => pattern.test(body));

    if (containsLink) {
      // Delete the message first (applies to all modes)
      try {
        await conn.sendMessage(from, { delete: m.key });
      } catch (error) {
        console.error("Failed to delete message:", error);
      }

      // Handle based on mode
      switch (global.antiLinkMode) {
        case 'delete':
          await reply(`⚠️ Links not allowed! Message from @${sender.split('@')[0]} was deleted.`, { mentions: [sender] });
          break;

        case 'kick':
          await reply(`⚠️ Links not allowed! @${sender.split('@')[0]} has been kicked.`, { mentions: [sender] });
          await conn.groupParticipantsUpdate(from, [sender], "remove");
          break;

        case 'warn':
        default:
          global.warnings[sender] = (global.warnings[sender] || 0) + 1;
          const warnCount = global.warnings[sender];

          if (warnCount < 3) {
            await reply(
              `⚠️ *WARNING ${warnCount}/3* - Links not allowed!\n` +
              `User: @${sender.split('@')[0]}\n` +
              `Next violation will result in a kick!`,
              { mentions: [sender] }
            );
          } else {
            await reply(`🚫 @${sender.split('@')[0]} has been kicked for sending links repeatedly!`, { mentions: [sender] });
            await conn.groupParticipantsUpdate(from, [sender], "remove");
            delete global.warnings[sender];
          }
          break;
      }
    }
  } catch (error) {
    console.error("Anti-link error:", error);
    reply("❌ Error processing anti-link rule.");
  }
});
