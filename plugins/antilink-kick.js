cmd({
  pattern: "antilink",
  desc: "Control anti-link system",
  category: "admin",
  isAdmin: true
}, async (m, text, { isAdmin }) => {
  try {
    if (!isAdmin) return m.reply("❌ Only admins can control anti-link settings");

    const [action] = text.toLowerCase().split(' ');
    
    if (!action) {
      return m.reply(
        `⚙️ *Anti-Link Help*\n\n` +
        `*Enable/Disable:*\n` +
        `.antilink on - Enable protection\n` +
        `.antilink off - Disable system\n\n` +
        `*Modes:*\n` +
        `.antilink warn - 3 warnings then kick\n` +
        `.antilink delete - Just delete links\n` +
        `.antilink kick - Instant removal\n\n` +
        `*Status:*\n` +
        `.antilink status - Show current settings`
      );
    }

    // Rest of your command handling code...
    
  } catch (error) {
    console.error("Command error:", error);
    m.reply("❌ Error processing command");
  }
});
