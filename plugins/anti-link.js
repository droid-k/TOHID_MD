const { cmd } = require('../command');

// Global storage for settings
if (!global.antiLinkSettings) {
  global.antiLinkSettings = {
    mode: 'warn', // Default mode
    enabled: true,
    warnings: {}
  };
}

// Command to control anti-link
cmd({
  pattern: "antilink",
  desc: "Control anti-link system",
  category: "admin",
  isAdmin: true
}, async (m, text) => {
  const [action, mode] = text.toLowerCase().split(' ');

  // Enable/disable system
  if (action === 'on') {
    global.antiLinkSettings.enabled = true;
    return m.reply(`✅ Anti-link system enabled (Current mode: ${global.antiLinkSettings.mode})`);
  }
  
  if (action === 'off') {
    global.antiLinkSettings.enabled = false;
    return m.reply('❌ Anti-link system disabled');
  }

  // Change mode
  if (['warn', 'delete', 'kick'].includes(action)) {
    global.antiLinkSettings.mode = action;
    return m.reply(`♻️ Anti-link mode set to: ${action.toUpperCase()}`);
  }

  // Show status
  if (action === 'status') {
    return m.reply(
      `🛡️ *Anti-Link Status*\n` +
      `• System: ${global.antiLinkSettings.enabled ? 'ON' : 'OFF'}\n` +
      `• Mode: ${global.antiLinkSettings.mode.toUpperCase()}\n` +
      `• Commands:\n` +
      `  - antilink on/off\n` +
      `  - antilink warn/delete/kick\n` +
      `  - antilink status`
    );
  }

  return m.reply(
    `ℹ️ Usage:\n` +
    `• Enable: antilink on\n` +
    `• Disable: antilink off\n` +
    `• Set mode: antilink warn/delete/kick\n` +
    `• Check status: antilink status`
  );
});

// Link detection handler
cmd({
  on: "body"
}, async (conn, m, store, { from, body, sender, isGroup, isAdmins, isBotAdmins }) => {
  try {
    const { enabled, mode, warnings } = global.antiLinkSettings;
    
    // Skip if disabled, not a group, or user is admin
    if (!enabled || !isGroup || isAdmins || !isBotAdmins) return;

    const linkPatterns = [
      /https?:\/\/(?:chat\.whatsapp\.com|wa\.me)\/\S+/gi,
      /https?:\/\/(?:t\.me|telegram\.me)\/\S+/gi,
      /https?:\/\/(?:www\.)?(youtube|facebook|instagram|twitter|tiktok|discord)\.com\/\S+/gi,
      /https?:\/\/youtu\.be\/\S+/gi
    ];

    if (linkPatterns.some(pattern => pattern.test(body))) {
      // Delete the message first
      await conn.sendMessage(from, { delete: m.key }).catch(console.error);

      // Handle based on mode
      switch (mode) {
        case 'delete':
          await conn.sendMessage(from, 
            { text: `⚠️ Link deleted from @${sender.split('@')[0]}`, mentions: [sender] },
            { quoted: m }
          );
          break;

        case 'kick':
          await conn.sendMessage(from,
            { text: `🚫 @${sender.split('@')[0]} kicked for sending links`, mentions: [sender] },
            { quoted: m }
          );
          await conn.groupParticipantsUpdate(from, [sender], "remove");
          break;

        case 'warn':
        default:
          warnings[sender] = (warnings[sender] || 0) + 1;
          
          if (warnings[sender] < 3) {
            await conn.sendMessage(from,
              { 
                text: `⚠️ Warning ${warnings[sender]}/3 to @${sender.split('@')[0]} for links!\nNext violation = kick!`,
                mentions: [sender] 
              },
              { quoted: m }
            );
          } else {
            await conn.sendMessage(from,
              { text: `🚫 @${sender.split('@')[0]} kicked (3 violations)`, mentions: [sender] },
              { quoted: m }
            );
            await conn.groupParticipantsUpdate(from, [sender], "remove");
            delete warnings[sender];
          }
          break;
      }
    }
  } catch (error) {
    console.error("Anti-link error:", error);
  }
});
