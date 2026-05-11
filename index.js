// index.js
const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { token, pointName, pointEmoji, creditName, creditEmoji, botName,
        dailyMin, dailyMax, weeklyMin, weeklyMax,
        dailyCooldownMs, weeklyCooldownMs } = require('./config');
const db = require('./db');

const TOKEN    = process.env.TOKEN     || token;
const CLIENT_ID = process.env.CLIENT_ID || require('./config').clientId;
const GUILD_ID  = process.env.GUILD_ID  || require('./config').guildId;
const ADMIN_ROLE_ID = '1452225986346356777';

const HUNT_COOLDOWN      = 30 * 1000;      // 30 detik
const ROB_COOLDOWN       = 5 * 60 * 1000;  // 5 menit
const VOICE_XP_INTERVAL  = 60 * 1000;      // tiap 1 menit di voice
const VOICE_XP_MIN       = 3;
const VOICE_XP_MAX       = 8;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ]
});

// ─── Voice XP tracking ───────────────────────────────────────────────
const voiceTimers = new Map();

function startVoiceXP(userId) {
  if (voiceTimers.has(userId)) return;
  const interval = setInterval(() => {
    const userData = db.getUser(userId);
    const xp = rand(VOICE_XP_MIN, VOICE_XP_MAX);
    db.updateUser(userId, {
      points: userData.points + xp,
      voice: (userData.voice || 0) + xp,
    });
  }, VOICE_XP_INTERVAL);
  voiceTimers.set(userId, interval);
}

function stopVoiceXP(userId) {
  if (voiceTimers.has(userId)) {
    clearInterval(voiceTimers.get(userId));
    voiceTimers.delete(userId);
  }
}

// ─── Animals ─────────────────────────────────────────────────────────
const animals = [
  { name: 'Burung Pipit', emoji: '🐦',  tier: 'Basic',     min: 200,   max: 800   },
  { name: 'Ayam Hutan',   emoji: '🐓',  tier: 'Basic',     min: 400,   max: 1000  },
  { name: 'Bebek',        emoji: '🦆',  tier: 'Basic',     min: 350,   max: 900   },
  { name: 'Kelinci',      emoji: '🐰',  tier: 'Common',    min: 800,   max: 1800  },
  { name: 'Rubah',        emoji: '🦊',  tier: 'Common',    min: 900,   max: 2000  },
  { name: 'Rusa',         emoji: '🦌',  tier: 'Common',    min: 1000,  max: 2500  },
  { name: 'Babi Hutan',   emoji: '🐗',  tier: 'Rare',      min: 2000,  max: 4000  },
  { name: 'Serigala',     emoji: '🐺',  tier: 'Rare',      min: 2500,  max: 5000  },
  { name: 'Buaya',        emoji: '🐊',  tier: 'Rare',      min: 2800,  max: 5500  },
  { name: 'Gorila',       emoji: '🦍',  tier: 'Epic',      min: 3500,  max: 7000  },
  { name: 'Harimau',      emoji: '🐯',  tier: 'Epic',      min: 4000,  max: 8000  },
  { name: 'Singa',        emoji: '🦁',  tier: 'Epic',      min: 4500,  max: 9000  },
  { name: 'Gajah',        emoji: '🐘',  tier: 'Epic',      min: 5000,  max: 10000 },
  { name: 'Hiu Putih',    emoji: '🦈',  tier: 'Legendary', min: 7000,  max: 13000 },
  { name: 'Naga',         emoji: '🐉',  tier: 'Legendary', min: 10000, max: 20000 },
  { name: 'Phoenix',      emoji: '🔥',  tier: 'Mythic',    min: 15000, max: 30000 },
  { name: 'Unicorn',      emoji: '🦄',  tier: 'Mythic',    min: 18000, max: 35000 },
];

const tierWeights = { Basic: 40, Common: 30, Rare: 15, Epic: 10, Legendary: 4, Mythic: 1 };

function pickAnimal() {
  const total = animals.reduce((s, a) => s + (tierWeights[a.tier] || 1), 0);
  let roll = Math.random() * total;
  for (const a of animals) { roll -= (tierWeights[a.tier] || 1); if (roll <= 0) return a; }
  return animals[0];
}

const enemies = [
  { name: 'Goblin',      emoji: '👺', min: 500,  max: 2000  },
  { name: 'Gorila Gila', emoji: '🦍', min: 1000, max: 3000  },
  { name: 'Beruang',     emoji: '🐻', min: 1500, max: 4000  },
  { name: 'Hiu',         emoji: '🦈', min: 2000, max: 5000  },
  { name: 'Troll',       emoji: '👹', min: 2500, max: 6000  },
  { name: 'Naga Jahat',  emoji: '🐲', min: 5000, max: 12000 },
];

const shopItems = [
  { id: 1, name: 'Custom Role', price: 100000, emoji: '🎭', desc: 'Dapetin role kustom di server' },
  { id: 2, name: 'VIP Badge',   price: 50000,  emoji: '⭐', desc: 'Badge VIP eksklusif'           },
  { id: 3, name: 'Name Color',  price: 30000,  emoji: '🎨', desc: 'Warna nama kustom'             },
];

const tierColors = { Basic: 0x95a5a6, Common: 0x2ecc71, Rare: 0x3498db, Epic: 0x9b59b6, Legendary: 0xf39c12, Mythic: 0xff6b6b };

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function formatTime(ms) {
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}j ${m}m`;
  if (m > 0) return `${m}m ${s}d`;
  return `${s}d`;
}

function getRank(userId) {
  const sorted = Object.entries(db.getAllUsers()).sort((a, b) => b[1].points - a[1].points);
  const idx = sorted.findIndex(([id]) => id === userId);
  return idx === -1 ? '—' : `#${idx + 1}`;
}

function isAdmin(member) { return member.roles.cache.has(ADMIN_ROLE_ID); }

// ─── Register commands ────────────────────────────────────────────────
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder().setName('daily').setDescription('Claim poin harian kamu'),
    new SlashCommandBuilder().setName('weekly').setDescription('Claim poin mingguan kamu'),
    new SlashCommandBuilder().setName('balance').setDescription('Cek saldo XML Point kamu'),
    new SlashCommandBuilder().setName('hunt').setDescription('Berburu hewan (cooldown 30 detik)'),
    new SlashCommandBuilder().setName('collection').setDescription('Lihat koleksi hewan kamu'),
    new SlashCommandBuilder()
      .setName('rob').setDescription('Coba rampok credits user lain (berisiko!)')
      .addUserOption(o => o.setName('target').setDescription('Target user').setRequired(true)),
    new SlashCommandBuilder().setName('leaderboard').setDescription('Top ranking server'),
    new SlashCommandBuilder()
      .setName('give').setDescription('Kasih poin ke user lain')
      .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
      .addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah poin').setRequired(true).setMinValue(1)),
    new SlashCommandBuilder().setName('shop').setDescription('Lihat toko penukaran point'),
    new SlashCommandBuilder()
      .setName('addpoints').setDescription('[ADMIN] Tambah poin ke user')
      .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
      .addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah poin').setRequired(true).setMinValue(1)),
    new SlashCommandBuilder()
      .setName('removepoints').setDescription('[ADMIN] Kurangi poin dari user')
      .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
      .addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah poin').setRequired(true).setMinValue(1)),
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ Slash commands registered!');
  } catch (err) { console.error('Failed to register commands:', err); }
}

// ─── Ready ────────────────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`✅ ${botName} Bot online: ${client.user.tag}`);
  client.user.setActivity(`${pointEmoji} ${pointName}`, { type: 3 });
  await registerCommands();
});

// ─── Chat XP ─────────────────────────────────────────────────────────
client.on('messageCreate', msg => {
  if (msg.author.bot || !msg.guild) return;
  const u = db.getUser(msg.author.id);
  db.updateUser(msg.author.id, { chat: (u.chat || 0) + 1, points: u.points + rand(1, 5) });
});

// ─── Voice XP ────────────────────────────────────────────────────────
client.on('voiceStateUpdate', (oldState, newState) => {
  const userId = newState.member?.id || oldState.member?.id;
  if (!userId || newState.member?.user?.bot) return;
  if (!oldState.channelId && newState.channelId) startVoiceXP(userId);
  else if (oldState.channelId && !newState.channelId) stopVoiceXP(userId);
});

// ─── Interactions ─────────────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    if (interaction.customId === 'remind_daily') interaction.reply({ content: `⏰ Oke! Ingatkan kamu besok untuk claim daily!`, ephemeral: true });
    else if (interaction.customId === 'remind_weekly') interaction.reply({ content: `⏰ Oke! Ingatkan minggu depan untuk claim weekly!`, ephemeral: true });
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  const { commandName, user, guild } = interaction;
  const userId = user.id;

  // /daily
  if (commandName === 'daily') {
    const ud = db.getUser(userId);
    const diff = Date.now() - (ud.lastDaily ? new Date(ud.lastDaily).getTime() : 0);
    if (diff < dailyCooldownMs) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`⏰ Tunggu **${formatTime(dailyCooldownMs - diff)}** lagi.`)], ephemeral: true });
    const reward = rand(dailyMin, dailyMax);
    db.updateUser(userId, { points: ud.points + reward, lastDaily: new Date().toISOString() });
    interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('✅ Daily Claimed!').setDescription(`Reward: ${pointEmoji} **${reward.toLocaleString()} ${pointName}**`).setFooter({ text: `${botName} System` })],
      components: [{ type: 1, components: [{ type: 2, style: 1, label: '⏰ Ingatkan Saya', custom_id: 'remind_daily' }] }]
    });
  }

  // /weekly
  else if (commandName === 'weekly') {
    const ud = db.getUser(userId);
    const diff = Date.now() - (ud.lastWeekly ? new Date(ud.lastWeekly).getTime() : 0);
    if (diff < weeklyCooldownMs) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`⏰ Tunggu **${formatTime(weeklyCooldownMs - diff)}** lagi.`)], ephemeral: true });
    const reward = rand(weeklyMin, weeklyMax);
    db.updateUser(userId, { points: ud.points + reward, lastWeekly: new Date().toISOString() });
    interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xffd700).setTitle('✅ Weekly Claimed!').setDescription(`Reward: ${pointEmoji} **${reward.toLocaleString()} ${pointName}**`).setFooter({ text: `${botName} System` })],
      components: [{ type: 1, components: [{ type: 2, style: 1, label: '⏰ Ingatkan Minggu Depan', custom_id: 'remind_weekly' }] }]
    });
  }

  // /balance
  else if (commandName === 'balance') {
    const ud = db.getUser(userId);
    const totalAnimals = Object.values(ud.collection || {}).reduce((a, b) => a + b, 0);
    interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`${pointEmoji} ${pointName}`).setDescription(`**${user.username}**`).setThumbnail(user.displayAvatarURL({ size: 128 }))
        .addFields(
          { name: '🏆 Rank',          value: getRank(userId),                              inline: true },
          { name: '💬 Chat',          value: (ud.chat || 0).toLocaleString(),              inline: true },
          { name: '🎙️ Voice XP',     value: `${(ud.voice || 0).toLocaleString()} XP`,    inline: true },
          { name: `${pointEmoji} Total`, value: `**${ud.points.toLocaleString()} ${pointName}**`, inline: true },
          { name: `${creditEmoji} Credits`, value: ud.credits.toLocaleString(),            inline: true },
          { name: '🎒 Koleksi',       value: `${totalAnimals} hewan`,                     inline: true },
        ).setFooter({ text: `${botName} | ${new Date().toLocaleString('id-ID')}` })]
    });
  }

  // /hunt
  else if (commandName === 'hunt') {
    const ud = db.getUser(userId);
    const diff = Date.now() - (ud.lastHunt ? new Date(ud.lastHunt).getTime() : 0);
    if (diff < HUNT_COOLDOWN) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`⏰ Tunggu **${formatTime(HUNT_COOLDOWN - diff)}** lagi.`)], ephemeral: true });
    db.updateUser(userId, { lastHunt: new Date().toISOString() });

    // 8% chance diserang
    if (Math.random() < 0.08) {
      const enemy = enemies[Math.floor(Math.random() * enemies.length)];
      const loss = rand(enemy.min, enemy.max);
      db.updateUser(userId, { credits: Math.max(0, ud.credits - loss) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setTitle('💀 Apes!').setDescription(`Kamu diserang ${enemy.emoji} **${enemy.name}** dan kehilangan **-${loss.toLocaleString()} ${creditName}**!`)] });
    }

    const animal = pickAnimal();
    const gain = rand(animal.min, animal.max);
    const col = ud.collection || {};
    col[animal.name] = (col[animal.name] || 0) + 1;
    db.updateUser(userId, { credits: ud.credits + gain, collection: col });
    interaction.reply({
      embeds: [new EmbedBuilder().setColor(tierColors[animal.tier] || 0x57f287).setTitle('🏹 Berhasil!')
        .setDescription(`Kamu menangkap ${animal.emoji} **${animal.name}**\n**[${animal.tier}]** — Dapat **+${gain.toLocaleString()} ${creditName}**!`)
        .setFooter({ text: `Koleksi: ${col[animal.name]}x ${animal.name}` })]
    });
  }

  // /collection
  else if (commandName === 'collection') {
    const ud = db.getUser(userId);
    const col = ud.collection || {};
    if (!Object.keys(col).length) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Koleksi kosong! Coba `/hunt` dulu.')], ephemeral: true });
    const byTier = {};
    for (const a of animals) { if (col[a.name]) { if (!byTier[a.tier]) byTier[a.tier] = []; byTier[a.tier].push(`${a.emoji} **${a.name}** x${col[a.name]}`); } }
    const fields = [];
    for (const tier of ['Mythic','Legendary','Epic','Rare','Common','Basic']) {
      if (byTier[tier]) fields.push({ name: tier, value: byTier[tier].join('\n'), inline: false });
    }
    interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x9b59b6).setTitle(`🎒 Koleksi ${user.username}`)
        .setDescription(`Total: **${Object.values(col).reduce((a,b)=>a+b,0)} hewan** ditangkap`)
        .addFields(fields).setThumbnail(user.displayAvatarURL({ size: 128 })).setFooter({ text: `${botName} Collection` })]
    });
  }

  // /rob
  else if (commandName === 'rob') {
    const target = interaction.options.getUser('target');
    const ud = db.getUser(userId);
    const td = db.getUser(target.id);
    if (target.id === userId) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Gak bisa rob diri sendiri!')], ephemeral: true });
    if (td.credits < 100) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`❌ **${target.username}** gak punya cukup credits!`)], ephemeral: true });
    const diff = Date.now() - (ud.lastRob ? new Date(ud.lastRob).getTime() : 0);
    if (diff < ROB_COOLDOWN) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`⏰ Tunggu **${formatTime(ROB_COOLDOWN - diff)}** lagi.`)], ephemeral: true });
    db.updateUser(userId, { lastRob: new Date().toISOString() });

    if (Math.random() < 0.65) {
      const fine = rand(200, Math.min(1000, ud.credits));
      db.updateUser(userId, { credits: Math.max(0, ud.credits - fine) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setTitle('🚔 Ketangkep!').setDescription(`Kamu ketangkep pas mau rob **${target.username}**!\nKena denda **-${fine.toLocaleString()} ${creditName}**!`)] });
    }

    const robAmount = Math.floor(td.credits * (rand(10, 40) / 100));
    db.updateUser(userId, { credits: ud.credits + robAmount });
    db.updateUser(target.id, { credits: td.credits - robAmount });
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('💰 Rob Berhasil!').setDescription(`Kamu berhasil rampok **${target.username}**!\nDapat **+${robAmount.toLocaleString()} ${creditName}**! 🏃`)] });
  }

  // /leaderboard
  else if (commandName === 'leaderboard') {
    const sorted = Object.entries(db.getAllUsers()).sort((a,b)=>b[1].points-a[1].points).slice(0,10);
    const lines = await Promise.all(sorted.map(async ([id,data],i) => {
      let name; try { name=(await guild.members.fetch(id)).user.username; } catch { name=`User#${id.slice(-4)}`; }
      return `${i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`} **${name}** — ${pointEmoji} ${data.points.toLocaleString()}`;
    }));
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setTitle('🏆 TOP LEADERBOARD').setDescription(lines.join('\n')||'Belum ada data.').setFooter({ text: `${botName} | ${new Date().toLocaleString('id-ID')}` })] });
  }

  // /give
  else if (commandName === 'give') {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('jumlah');
    const ud = db.getUser(userId);
    if (target.id === userId) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Gak bisa kasih ke diri sendiri!')], ephemeral: true });
    if (ud.points < amount) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Poin kamu gak cukup!')], ephemeral: true });
    db.updateUser(userId, { points: ud.points - amount });
    db.updateUser(target.id, { points: db.getUser(target.id).points + amount });
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`${pointEmoji} **${user.username}** kasih **${amount.toLocaleString()} ${pointName}** ke **${target.username}**!`)] });
  }

  // /shop
  else if (commandName === 'shop') {
    const lines = shopItems.map(i=>`${i.emoji} **${i.name}** — ${pointEmoji} ${i.price.toLocaleString()} ${pointName}\n> ${i.desc}`).join('\n\n');
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('🛒 Toko XML Point').setDescription(lines).setFooter({ text: 'Hubungi admin untuk penukaran point' })] });
  }

  // /addpoints
  else if (commandName === 'addpoints') {
    const member = await guild.members.fetch(userId);
    if (!isAdmin(member)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Kamu gak punya role yang diperlukan!')], ephemeral: true });
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('jumlah');
    db.updateUser(target.id, { points: db.getUser(target.id).points + amount });
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Berhasil tambah ${pointEmoji} **${amount.toLocaleString()} ${pointName}** ke **${target.username}**`)] });
  }

  // /removepoints
  else if (commandName === 'removepoints') {
    const member = await guild.members.fetch(userId);
    if (!isAdmin(member)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Kamu gak punya role yang diperlukan!')], ephemeral: true });
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('jumlah');
    const td = db.getUser(target.id);
    db.updateUser(target.id, { points: Math.max(0, td.points - amount) });
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`✅ Berhasil kurangi ${pointEmoji} **${amount.toLocaleString()} ${pointName}** dari **${target.username}**`)] });
  }
});

client.login(TOKEN);
