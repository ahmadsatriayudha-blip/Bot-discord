module.exports = {
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  // Nama kustom
  botName: 'XML',
  pointName: 'XML Point',
  pointEmoji: '🔷',
  creditName: 'Credits',
  creditEmoji: '💰',

  // Daily & Weekly reward
  dailyMin: 500,
  dailyMax: 1500,
  weeklyMin: 1500,
  weeklyMax: 3000,

  // Hunt settings
  huntCooldownMs: 30 * 60 * 1000, // 30 menit

  // Cooldown daily/weekly
  dailyCooldownMs: 24 * 60 * 60 * 1000,    // 24 jam
  weeklyCooldownMs: 7 * 24 * 60 * 60 * 1000, // 7 hari
};
