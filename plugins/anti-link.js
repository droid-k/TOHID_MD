const { cmd } = require('../command');
const config = require("../config");

// Initialize anti-link settings if not exists
if (!global.antiLinkSettings) {
  global.antiLinkSettings = {
    enabled: config.ANTI_LINK === 'true',
    deleteMessage: true,
    warnUser: true,
    kickUser: true,
    warnLimit: 3
  };
}

// List of link patterns to detect
const linkPatterns = [
  /https?:\/\/(?:chat\.whatsapp\.com|wa\.me)\/\S+/gi,
  /https?:\/\/(?:api\.whatsapp\.com|wa\.me)\/\S+/gi,
  /wa\.me\/\S+/gi,
  /https?:\/\/(?:t\.me|telegram\.me)\/\S+/gi,
  /https?:\/\/(?:www\.)?\.com\/\S+/gi,
  /https?:\/\/(?:www\.)?twitter\.com\/\S+/gi,
  /https?:\/\/(?:www\.)?linkedin\.com\/\S+/gi,
  /https?:\/\/(?:whatsapp\.com|channel\.me)\/\S+/gi,
  /https?:\/\/(?:www\.)?reddit\.com\/\S+/gi,
  /https?:\/\/(?:www\.)?discord\.com\/\S+/gi,
  /https?:\/\/(?:www\.)?twitch\.tv\/\S+/gi,
  /https?:\/\/(?:www\.)?vimeo\.com\/\S+/gi,
  /https?:\/\/(?:www\.)?dailymotion\.com\/\S+/gi,
  /https?:\/\/(?:www\.)?medium\.com\/\S+/gi
];

// Anti-link handler
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
    // Initialize warnings if not exists
    if (!global.warnings) {
      global.warnings = {};
    }

    // Only act in groups where bot is admin and sender isn't admin
    if (!isGroup || isAdmins || !isBotAdmins || !global.antiLinkSettings.enabled) {
      return;
    }

    // Check if message contains any forbidden links
    const containsLink = linkPatterns.some(pattern => pattern.test(body));

    if (containsLink) {
      console.log(`Link detected from ${sender}: ${body}`);

      // Delete the message if enabled
      if (global.antiLinkSettings.deleteMessage) {
        try {
          await conn.sendMessage(from, {
            delete: m.key
          });
          console.log(`Message deleted: ${m.key.id}`);
        } catch (error) {
          console.error("Failed to delete message:", error);
        }
      }

      // Warn the user if enabled
      if (global.antiLinkSettings.warnUser) {
        global.warnings[sender] = (global.warnings[sender] || 0) + 1;
        const warningCount = global.warnings[sender];

        if (warningCount < global.antiLinkSettings.warnLimit) {
          await conn.sendMessage(from, {
            text: `‎*⚠️LINKS ARE NOT ALLOWED⚠️*\n` +
                  `*╭────⬡ WARNING ⬡────*\n` +
                  `*├▢ USER :* @${sender.split('@')[0]}!\n` +
                  `*├▢ COUNT : ${warningCount}*\n` +
                  `*├▢ REASON : LINK SENDING*\n` +
                  `*├▢ WARN LIMIT : ${global.antiLinkSettings.warnLimit}*\n` +
                  `*╰─────⬡ *TOHID_MD* ⬡────*`,
            mentions: [sender]
          });
        } else if (global.antiLinkSettings.kickUser) {
          // Kick user if they exceed warning limit and kick is enabled
          await conn.sendMessage(from, {
            text: `@${sender.split('@')[0]} *TOHID_MD BOT HAS REMOVED YOU - WARN LIMIT EXCEEDED!*`,
            mentions: [sender]
          });
          await conn.groupParticipantsUpdate(from, [sender], "remove");
          delete global.warnings[sender];
        }
      } else if (global.antiLinkSettings.kickUser) {
        // Kick immediately if warn is disabled but kick is enabled
        await conn.sendMessage(from, {
          text: `@${sender.split('@')[0]} *TOHID_MD BOT HAS REMOVED YOU - LINKS ARE NOT ALLOWED!*`,
          mentions: [sender]
        });
        await conn.groupParticipantsUpdate(from, [sender], "remove");
      }
    }
  } catch (error) {
    console.error("Anti-link error:", error);
    reply("❌ An error occurred while processing the message.");
  }
});

// Command to control anti-link settings
cmd({
  pattern: "antilink",
  desc: "Configure anti-link settings",
  category: "group",
  onlyGroup: true,
  fromMe: true,
  use: '<on/off/delete/warn/kick/settings>'
}, async (conn, m, text, { isBotAdmins }) => {
  if (!isBotAdmins) return m.reply("Only bot admins can configure anti-link settings");

  const [action, value] = text.toLowerCase().split(' ');
  
  if (!action) {
    return m.reply(`Current anti-link settings:\n` +
                   `Enabled: ${global.antiLinkSettings.enabled}\n` +
                   `Delete Message: ${global.antiLinkSettings.deleteMessage}\n` +
                   `Warn User: ${global.antiLinkSettings.warnUser}\n` +
                   `Kick User: ${global.antiLinkSettings.kickUser}\n` +
                   `Warn Limit: ${global.antiLinkSettings.warnLimit}\n\n` +
                   `Usage: *!antilink <on/off/delete/warn/kick/limit> <value>*`);
  }

  switch (action) {
    case 'on':
      global.antiLinkSettings.enabled = true;
      m.reply("Anti-link system is now *ENABLED*");
      break;
    case 'off':
      global.antiLinkSettings.enabled = false;
      m.reply("Anti-link system is now *DISABLED*");
      break;
    case 'delete':
      const deleteValue = value === 'on' || value === 'true';
      global.antiLinkSettings.deleteMessage = deleteValue;
      m.reply(`Message deletion is now *${deleteValue ? 'ENABLED' : 'DISABLED'}* for anti-link`);
      break;
    case 'warn':
      const warnValue = value === 'on' || value === 'true';
      global.antiLinkSettings.warnUser = warnValue;
      m.reply(`User warnings are now *${warnValue ? 'ENABLED' : 'DISABLED'}* for anti-link`);
      break;
    case 'kick':
      const kickValue = value === 'on' || value === 'true';
      global.antiLinkSettings.kickUser = kickValue;
      m.reply(`User kicking is now *${kickValue ? 'ENABLED' : 'DISABLED'}* for anti-link`);
      break;
    case 'limit':
      const limit = parseInt(value);
      if (isNaN(limit) {
        return m.reply("Please provide a valid number for warn limit");
      }
      global.antiLinkSettings.warnLimit = limit;
      m.reply(`Warning limit set to *${limit}* before kicking`);
      break;
    case 'settings':
      m.reply(`Current anti-link settings:\n` +
              `Enabled: ${global.antiLinkSettings.enabled}\n` +
              `Delete Message: ${global.antiLinkSettings.deleteMessage}\n` +
              `Warn User: ${global.antiLinkSettings.warnUser}\n` +
              `Kick User: ${global.antiLinkSettings.kickUser}\n` +
              `Warn Limit: ${global.antiLinkSettings.warnLimit}`);
      break;
    default:
      m.reply("Invalid action. Use one of: on, off, delete, warn, kick, limit");
  }
});
