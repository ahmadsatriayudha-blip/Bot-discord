// index.js
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { token, pointName, pointEmoji, creditName, creditEmoji, botName,
        dailyMin, dailyMax, weeklyMin, weeklyMax,
        dailyCooldownMs, weeklyCooldownMs } = require('./config');
const db = require('./db');

const TOKEN     = process.env.TOKEN      || token;
const CLIENT_ID = process.env.CLIENT_ID  || require('./config').clientId;
const GUILD_ID  = process.env.GUILD_ID   || require('./config').guildId;
const ADMIN_ROLE_ID    = '1452225986346356777';
const INFINITY_ROLE_ID = '1502861777791352852';

const HUNT_COOLDOWN     = 30 * 1000;
const FISH_COOLDOWN     = 45 * 1000;
const ROB_COOLDOWN      = 5 * 60 * 1000;
const ROBHUNT_COOLDOWN  = 5 * 60 * 1000;
const TRIVIA_COOLDOWN   = 3 * 60 * 1000;
const SLOTS_COOLDOWN    = 60 * 1000;
const VOICE_XP_INTERVAL = 60 * 1000;
const VOICE_XP_MIN = 3;
const VOICE_XP_MAX = 8;
const BIRTHDAY_BONUS = 5000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
  ]
});

// ─── Voice XP ────────────────────────────────────────────────────────
const voiceTimers = new Map();
function startVoiceXP(userId) {
  if (voiceTimers.has(userId)) return;
  const interval = setInterval(() => {
    const u = db.getUser(userId);
    const xp = rand(VOICE_XP_MIN, VOICE_XP_MAX);
    db.updateUser(userId, { points: u.points + xp, voice: (u.voice || 0) + xp });
  }, VOICE_XP_INTERVAL);
  voiceTimers.set(userId, interval);
}
function stopVoiceXP(userId) {
  if (voiceTimers.has(userId)) { clearInterval(voiceTimers.get(userId)); voiceTimers.delete(userId); }
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

const fishes = [
  { name: 'Ikan Kecil',  emoji: '🐟', tier: 'Common',    min: 100,   max: 500   },
  { name: 'Ikan Mas',    emoji: '🐠', tier: 'Common',    min: 200,   max: 700   },
  { name: 'Ikan Lele',   emoji: '🐡', tier: 'Common',    min: 300,   max: 800   },
  { name: 'Gurita',      emoji: '🐙', tier: 'Rare',      min: 800,   max: 2000  },
  { name: 'Penyu',       emoji: '🐢', tier: 'Rare',      min: 1000,  max: 2500  },
  { name: 'Lumba-lumba', emoji: '🐬', tier: 'Epic',      min: 2000,  max: 5000  },
  { name: 'Paus',        emoji: '🐋', tier: 'Epic',      min: 3000,  max: 7000  },
  { name: 'Hiu Hammer',  emoji: '🦈', tier: 'Legendary', min: 5000,  max: 12000 },
  { name: 'Kraken',      emoji: '🦑', tier: 'Mythic',    min: 10000, max: 25000 },
];
const fishWeights = { Common: 50, Rare: 25, Epic: 15, Legendary: 8, Mythic: 2 };
function pickFish() {
  const total = fishes.reduce((s, f) => s + (fishWeights[f.tier] || 1), 0);
  let roll = Math.random() * total;
  for (const f of fishes) { roll -= (fishWeights[f.tier] || 1); if (roll <= 0) return f; }
  return fishes[0];
}

const allCreatures = [...animals, ...fishes];

// ─── Slots ────────────────────────────────────────────────────────────
// Tiap slot result: hewan (dapet koleksi), credits bonus, atau zonk
const slotSymbols = [
  { emoji: '🐦', label: 'Burung Pipit', type: 'animal', name: 'Burung Pipit', weight: 20 },
  { emoji: '🐰', label: 'Kelinci',      type: 'animal', name: 'Kelinci',      weight: 15 },
  { emoji: '🐺', label: 'Serigala',     type: 'animal', name: 'Serigala',     weight: 10 },
  { emoji: '🐯', label: 'Harimau',      type: 'animal', name: 'Harimau',      weight: 6  },
  { emoji: '🐉', label: 'Naga',         type: 'animal', name: 'Naga',         weight: 3  },
  { emoji: '🦄', label: 'Unicorn',      type: 'animal', name: 'Unicorn',      weight: 1  },
  { emoji: '💰', label: 'Credits',      type: 'credits', weight: 15            },
  { emoji: '💎', label: 'Big Credits',  type: 'bigcredits', weight: 5          },
  { emoji: '💀', label: 'ZONK',         type: 'zonk',    weight: 25            },
];

function spinSlot() {
  const total = slotSymbols.reduce((s, sym) => s + sym.weight, 0);
  let roll = Math.random() * total;
  for (const sym of slotSymbols) { roll -= sym.weight; if (roll <= 0) return sym; }
  return slotSymbols[slotSymbols.length - 1];
}

// ─── Trivia ───────────────────────────────────────────────────────────
const triviaQuestions = [
  { q: 'Game battle royale dari Epic Games yang sangat populer?', a: 'fortnite', hint: 'F_______' },
  { q: 'Karakter utama di game The Legend of Zelda?', a: 'link', hint: 'L___' },
  { q: 'Game Minecraft dibuat oleh siapa?', a: 'notch', hint: 'N____' },
  { q: 'Game FPS populer dari Valve yang rilis 2012?', a: 'cs:go', hint: 'CS:__' },
  { q: 'Nama musuh utama di game Mario Bros?', a: 'bowser', hint: 'B_____' },
  { q: 'Game RPG open world dari Hoyoverse?', a: 'genshin impact', hint: 'G______ I_____' },
  { q: 'Game battle royale dari PUBG Corporation?', a: 'pubg', hint: 'P___' },
  { q: 'Studio yang membuat game God of War?', a: 'santa monica', hint: 'S____ M_____' },
  { q: 'Game dengan karakter bernama Master Chief?', a: 'halo', hint: 'H___' },
  { q: 'Game survival horror dari Capcom dengan karakter Leon?', a: 'resident evil', hint: 'R_______ E___' },
  { q: 'Game MOBA paling populer di dunia dari Valve?', a: 'dota 2', hint: 'D___ 2' },
  { q: 'Studio yang membuat game Elden Ring?', a: 'fromsoftware', hint: 'F___S_______' },
  { q: 'Game racing populer dari Nintendo?', a: 'mario kart', hint: 'M____ K___' },
  { q: 'Game dengan karakter Kratos?', a: 'god of war', hint: 'G__ O_ W__' },
  { q: 'Game sandbox survival dengan dunia blok?', a: 'minecraft', hint: 'M________' },
  { q: 'Game tembak-tembakan online dari Riot Games?', a: 'valorant', hint: 'V_______' },
  { q: 'Game RPG dari Square Enix dengan karakter Cloud?', a: 'final fantasy', hint: 'F____ F_____' },
  { q: 'Game open world di kota Los Santos?', a: 'gta v', hint: 'GTA _' },
  { q: 'Game fighting populer dari Nintendo dengan banyak karakter?', a: 'super smash bros', hint: 'S____ S____ B___' },
  { q: 'Game battle royale dari EA dengan karakter Legends?', a: 'apex legends', hint: 'A___ L______' },
];

// Active trivia sessions: userId -> { question, answer, timeout }
const triviaActive = new Map();

// ─── Shop ─────────────────────────────────────────────────────────────
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

async function getTop10Ids(guild) {
  const allUsers = Object.entries(db.getAllUsers()).sort((a, b) => b[1].points - a[1].points);
  const top10 = [];
  for (const [id] of allUsers) {
    if (top10.length >= 10) break;
    try {
      const m = await guild.members.fetch(id);
      if (m.roles.cache.has(INFINITY_ROLE_ID)) continue;
      top10.push(id);
    } catch { continue; }
  }
  return top10;
}

function isAdmin(member) { return member.roles.cache.has(ADMIN_ROLE_ID); }
function isInfinity(member) { return member.roles.cache.has(INFINITY_ROLE_ID); }

// ─── Birthday checker (runs every hour) ──────────────────────────────
let birthdayChannelId = null;

async function checkBirthdays() {
  const now = new Date();
  const todayMD = `${now.getMonth() + 1}-${now.getDate()}`;
  const allUsers = db.getAllUsers();

  for (const [userId, data] of Object.entries(allUsers)) {
    if (!data.birthday) continue;
    if (data.lastBirthdayYear === now.getFullYear()) continue;

    const [bMonth, bDay] = data.birthday.split('-').map(Number);
    if (bMonth === now.getMonth() + 1 && bDay === now.getDate()) {
      // Give bonus
      db.updateUser(userId, {
        points: data.points + BIRTHDAY_BONUS,
        lastBirthdayYear: now.getFullYear()
      });

      // Announce in birthday channel
      if (birthdayChannelId) {
        try {
          const channel = await client.channels.fetch(birthdayChannelId);
          channel.send({
            embeds: [new EmbedBuilder()
              .setColor(0xff69b4)
              .setTitle('🎂 Selamat Ulang Tahun!')
              .setDescription(`<@${userId}> selamat ulang tahun! 🎉\nBonus: ${pointEmoji} **${BIRTHDAY_BONUS.toLocaleString()} ${pointName}** sudah dikirim!`)
              .setFooter({ text: botName })]
          });
        } catch {}
      }

      // DM user
      try {
        const user = await client.users.fetch(userId);
        user.send({
          embeds: [new EmbedBuilder()
            .setColor(0xff69b4)
            .setTitle('🎂 Selamat Ulang Tahun!')
            .setDescription(`Selamat ulang tahun dari **${botName}**! 🎉\nKamu dapet bonus ${pointEmoji} **${BIRTHDAY_BONUS.toLocaleString()} ${pointName}**!`)]
        });
      } catch {}
    }
  }
}

// ─── Reminder checker (runs every minute) ────────────────────────────
async function checkReminders() {
  const allUsers = db.getAllUsers();
  const now = Date.now();

  for (const [userId, data] of Object.entries(allUsers)) {
    if (!data.remindEnabled) continue;

    const dailyReady = !data.lastDaily || (now - new Date(data.lastDaily).getTime()) >= dailyCooldownMs;
    const weeklyReady = !data.lastWeekly || (now - new Date(data.lastWeekly).getTime()) >= weeklyCooldownMs;
    const lastDailyRemind = data.lastDailyRemind ? new Date(data.lastDailyRemind).getTime() : 0;
    const lastWeeklyRemind = data.lastWeeklyRemind ? new Date(data.lastWeeklyRemind).getTime() : 0;

    try {
      const user = await client.users.fetch(userId);

      if (dailyReady && (now - lastDailyRemind) > dailyCooldownMs) {
        user.send({ embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`⏰ **Daily kamu udah bisa di-claim!** Ketik \`/daily\` sekarang 😄`)] });
        db.updateUser(userId, { lastDailyRemind: new Date().toISOString() });
      }

      if (weeklyReady && (now - lastWeeklyRemind) > weeklyCooldownMs) {
        user.send({ embeds: [new EmbedBuilder().setColor(0xffd700).setDescription(`⏰ **Weekly kamu udah bisa di-claim!** Ketik \`/weekly\` sekarang 😄`)] });
        db.updateUser(userId, { lastWeeklyRemind: new Date().toISOString() });
      }
    } catch {}
  }
}

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder().setName('daily').setDescription('Claim poin harian kamu'),
    new SlashCommandBuilder().setName('weekly').setDescription('Claim poin mingguan kamu'),
    new SlashCommandBuilder().setName('balance').setDescription('Cek saldo XML Point kamu'),
    new SlashCommandBuilder().setName('hunt').setDescription('Berburu hewan (cooldown 30 detik)'),
    new SlashCommandBuilder().setName('fish').setDescription('Mancing ikan (cooldown 45 detik)'),
    new SlashCommandBuilder().setName('collection').setDescription('Lihat koleksi hewan kamu'),
    new SlashCommandBuilder()
      .setName('slots').setDescription('Spin slot machine — taruhan credits, menang dapet hewan!')
      .addIntegerOption(o => o.setName('taruhan').setDescription('Jumlah credits yang ditaruhkan').setRequired(true).setMinValue(100)),
    new SlashCommandBuilder().setName('trivia').setDescription('Jawab trivia gaming dan dapet poin!'),
    new SlashCommandBuilder()
      .setName('birthday').setDescription('Set atau cek ulang tahun kamu (1x selamanya!)')
      .addStringOption(o => o.setName('tanggal').setDescription('Format: bulan-tanggal, contoh: 5-13').setRequired(false)),
    new SlashCommandBuilder()
      .setName('setbirthdaychannel').setDescription('[ADMIN] Set channel untuk ucapan ulang tahun')
      .addChannelOption(o => o.setName('channel').setDescription('Channel tujuan').setRequired(true)),
    new SlashCommandBuilder().setName('remind').setDescription('Toggle DM reminder daily & weekly'),
    new SlashCommandBuilder()
      .setName('rob').setDescription('Rampok credits user lain (berisiko!)')
      .addUserOption(o => o.setName('target').setDescription('Target user').setRequired(true)),
    new SlashCommandBuilder()
      .setName('robhunt').setDescription('Curi hewan dari koleksi user lain (75% ketangkep!)')
      .addUserOption(o => o.setName('target').setDescription('Target user').setRequired(true)),
    new SlashCommandBuilder()
      .setName('giveanimal').setDescription('Kasih hewan dari koleksi kamu ke user lain')
      .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
      .addStringOption(o => o.setName('hewan').setDescription('Nama hewan yang mau dikasih').setRequired(true)),
    new SlashCommandBuilder().setName('leaderboard').setDescription('Top ranking XML Point'),
    new SlashCommandBuilder().setName('top').setDescription('Top ranking Credits'),
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

client.once('ready', async () => {
  console.log(`✅ ${botName} Bot online: ${client.user.tag}`);
  client.user.setActivity(`${pointEmoji} ${pointName}`, { type: 3 });
  await registerCommands();

  // Check birthdays every hour
  setInterval(checkBirthdays, 60 * 60 * 1000);
  checkBirthdays();

  // Check reminders every minute
  setInterval(checkReminders, 60 * 1000);
});

client.on('messageCreate', msg => {
  if (msg.author.bot || !msg.guild) return;
  const u = db.getUser(msg.author.id);

  // Trivia answer check
  if (triviaActive.has(msg.author.id)) {
    const session = triviaActive.get(msg.author.id);
    if (msg.content.toLowerCase().trim() === session.answer) {
      clearTimeout(session.timeout);
      triviaActive.delete(msg.author.id);
      const reward = rand(200, 800);
      db.updateUser(msg.author.id, { points: u.points + reward });
      msg.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('✅ Benar!').setDescription(`Jawaban kamu benar! Dapet **+${reward.toLocaleString()} ${pointName}**! 🎉`)] });
      return;
    }
  }

  db.updateUser(msg.author.id, { chat: (u.chat || 0) + 1, points: u.points + rand(1, 5) });
});

client.on('voiceStateUpdate', (oldState, newState) => {
  const userId = newState.member?.id || oldState.member?.id;
  if (!userId || newState.member?.user?.bot) return;
  if (!oldState.channelId && newState.channelId) startVoiceXP(userId);
  else if (oldState.channelId && !newState.channelId) stopVoiceXP(userId);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    if (interaction.customId === 'remind_daily') interaction.reply({ content: `⏰ Ingatkan besok untuk claim daily!`, ephemeral: true });
    else if (interaction.customId === 'remind_weekly') interaction.reply({ content: `⏰ Ingatkan minggu depan untuk claim weekly!`, ephemeral: true });
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
    const member = await guild.members.fetch(userId);
    const ud = db.getUser(userId);
    const totalAnimals = Object.values(ud.collection || {}).reduce((a, b) => a + b, 0);

    if (isInfinity(member)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x00ffff).setTitle(`♾️ INFINITY — ${user.username}`)
          .setDescription(`> *"Di atas segalanya."*`).setThumbnail(user.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: '🏆 Rank', value: '∞', inline: true }, { name: '💬 Chat', value: '∞', inline: true },
            { name: '🎙️ Voice XP', value: '∞', inline: true }, { name: `${pointEmoji} Total`, value: '∞', inline: true },
            { name: `${creditEmoji} Credits`, value: '∞', inline: true }, { name: '🎒 Koleksi', value: `${totalAnimals} item`, inline: true },
          ).setFooter({ text: `♾️ Infinity Member • ${botName}` })]
      });
    }

    const top10 = await getTop10Ids(guild);
    const isTop10 = top10.includes(userId);
    const rankNum = top10.indexOf(userId) + 1;
    const creditsStr = ud.credits < 0 ? `**-${Math.abs(ud.credits).toLocaleString()}** 🔴` : ud.credits.toLocaleString();

    const allSorted = Object.entries(db.getAllUsers()).sort((a, b) => b[1].points - a[1].points);
    let actualRank = '—';
    let count = 0;
    for (const [id] of allSorted) {
      try { const m = await guild.members.fetch(id); if (isInfinity(m)) continue; count++; if (id === userId) { actualRank = `#${count}`; break; } } catch { continue; }
    }

    if (isTop10) {
      const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
      interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xffd700).setTitle(`${medals[rankNum-1]||'🏆'} TOP ${rankNum} — ${user.username}`)
          .setDescription(`> *"Salah satu yang terkuat di server ini."*`).setThumbnail(user.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: '🏆 Rank', value: actualRank, inline: true }, { name: '💬 Chat', value: (ud.chat||0).toLocaleString(), inline: true },
            { name: '🎙️ Voice XP', value: `${(ud.voice||0).toLocaleString()} XP`, inline: true },
            { name: `${pointEmoji} Total`, value: `**${ud.points.toLocaleString()} ${pointName}**`, inline: true },
            { name: `${creditEmoji} Credits`, value: creditsStr, inline: true }, { name: '🎒 Koleksi', value: `${totalAnimals} item`, inline: true },
          ).setFooter({ text: `✨ Elite Member • ${botName} | ${new Date().toLocaleString('id-ID')}` })]
      });
    } else {
      interaction.reply({
        embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`${pointEmoji} ${pointName}`).setDescription(`**${user.username}**`).setThumbnail(user.displayAvatarURL({ size: 128 }))
          .addFields(
            { name: '🏆 Rank', value: actualRank, inline: true }, { name: '💬 Chat', value: (ud.chat||0).toLocaleString(), inline: true },
            { name: '🎙️ Voice XP', value: `${(ud.voice||0).toLocaleString()} XP`, inline: true },
            { name: `${pointEmoji} Total`, value: `**${ud.points.toLocaleString()} ${pointName}**`, inline: true },
            { name: `${creditEmoji} Credits`, value: creditsStr, inline: true }, { name: '🎒 Koleksi', value: `${totalAnimals} item`, inline: true },
          ).setFooter({ text: `${botName} | ${new Date().toLocaleString('id-ID')}` })]
      });
    }
  }

  // /hunt
  else if (commandName === 'hunt') {
    const ud = db.getUser(userId);
    const diff = Date.now() - (ud.lastHunt ? new Date(ud.lastHunt).getTime() : 0);
    if (diff < HUNT_COOLDOWN) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`⏰ Tunggu **${formatTime(HUNT_COOLDOWN - diff)}** lagi.`)], ephemeral: true });
    db.updateUser(userId, { lastHunt: new Date().toISOString() });
    if (Math.random() < 0.08) {
      const enemy = enemies[Math.floor(Math.random() * enemies.length)];
      const loss = rand(enemy.min, enemy.max);
      db.updateUser(userId, { credits: ud.credits - loss });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setTitle('💀 Apes!').setDescription(`Kamu diserang ${enemy.emoji} **${enemy.name}** dan kehilangan **-${loss.toLocaleString()} ${creditName}**!\n${ud.credits-loss<0?'⚠️ Credits kamu minus!':''}`)] });
    }
    const animal = pickAnimal();
    const gain = rand(animal.min, animal.max);
    const col = ud.collection || {};
    col[animal.name] = (col[animal.name] || 0) + 1;
    db.updateUser(userId, { credits: ud.credits + gain, collection: col });
    interaction.reply({ embeds: [new EmbedBuilder().setColor(tierColors[animal.tier]||0x57f287).setTitle('🏹 Berhasil!').setDescription(`Kamu menangkap ${animal.emoji} **${animal.name}**\n**[${animal.tier}]** — Dapat **+${gain.toLocaleString()} ${creditName}**!`).setFooter({ text: `Koleksi: ${col[animal.name]}x ${animal.name}` })] });
  }

  // /fish
  else if (commandName === 'fish') {
    const ud = db.getUser(userId);
    const diff = Date.now() - (ud.lastFish ? new Date(ud.lastFish).getTime() : 0);
    if (diff < FISH_COOLDOWN) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`⏰ Tunggu **${formatTime(FISH_COOLDOWN - diff)}** lagi.`)], ephemeral: true });
    db.updateUser(userId, { lastFish: new Date().toISOString() });
    if (Math.random() < 0.10) {
      const junk = ['👟 Sepatu Bolong','🥫 Kaleng Bekas','🪣 Ember Rusak','🧤 Sarung Tangan'];
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x95a5a6).setTitle('🎣 Aduh...').setDescription(`Kamu malah dapet **${junk[Math.floor(Math.random()*junk.length)]}**... coba lagi! 😅`)] });
    }
    const fish = pickFish();
    const gain = rand(fish.min, fish.max);
    const col = ud.collection || {};
    col[fish.name] = (col[fish.name] || 0) + 1;
    db.updateUser(userId, { credits: ud.credits + gain, collection: col });
    interaction.reply({ embeds: [new EmbedBuilder().setColor(tierColors[fish.tier]||0x3498db).setTitle('🎣 Dapat Ikan!').setDescription(`Kamu mancing ${fish.emoji} **${fish.name}**\n**[${fish.tier}]** — Dapat **+${gain.toLocaleString()} ${creditName}**!`).setFooter({ text: `Koleksi: ${col[fish.name]}x ${fish.name}` })] });
  }

  // /collection
  else if (commandName === 'collection') {
    const ud = db.getUser(userId);
    const col = ud.collection || {};
    if (!Object.keys(col).length) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Koleksi kosong! Coba `/hunt` atau `/fish` dulu.')], ephemeral: true });
    const byTier = {};
    for (const a of allCreatures) { if (col[a.name]) { if (!byTier[a.tier]) byTier[a.tier] = []; byTier[a.tier].push(`${a.emoji} **${a.name}** x${col[a.name]}`); } }
    const fields = [];
    for (const tier of ['Mythic','Legendary','Epic','Rare','Common','Basic']) { if (byTier[tier]) fields.push({ name: tier, value: byTier[tier].join('\n'), inline: false }); }
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x9b59b6).setTitle(`🎒 Koleksi ${user.username}`).setDescription(`Total: **${Object.values(col).reduce((a,b)=>a+b,0)} item** dikumpulkan`).addFields(fields).setThumbnail(user.displayAvatarURL({size:128})).setFooter({text:`${botName} Collection`})] });
  }

  // /slots
  else if (commandName === 'slots') {
    const bet = interaction.options.getInteger('taruhan');
    const ud = db.getUser(userId);

    if (ud.credits < bet) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`❌ Credits kamu gak cukup! Punya: **${ud.credits.toLocaleString()}**`)], ephemeral: true });

    const diff = Date.now() - (ud.lastSlots ? new Date(ud.lastSlots).getTime() : 0);
    if (diff < SLOTS_COOLDOWN) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`⏰ Tunggu **${formatTime(SLOTS_COOLDOWN - diff)}** lagi.`)], ephemeral: true });

    db.updateUser(userId, { lastSlots: new Date().toISOString(), credits: ud.credits - bet });

    const s1 = spinSlot(), s2 = spinSlot(), s3 = spinSlot();
    const display = `${s1.emoji} | ${s2.emoji} | ${s3.emoji}`;

    // Check win: 3 sama
    if (s1.label === s2.label && s2.label === s3.label) {
      if (s1.type === 'zonk') {
        // Triple zonk = lose extra
        const extra = bet * 2;
        db.updateUser(userId, { credits: ud.credits - bet - extra });
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setTitle('🎰 TRIPLE ZONK!!').setDescription(`${display}\n\n💀 Kamu kena TRIPLE ZONK! Kehilangan **-${(bet+extra).toLocaleString()} ${creditName}** total!`)] });
      }
      if (s1.type === 'animal' || s1.type === 'bigcredits') {
        // Win animal + credits back
        const animalData = animals.find(a => a.name === s1.name);
        if (animalData) {
          const col = ud.collection || {};
          col[animalData.name] = (col[animalData.name] || 0) + 1;
          const bonusCredits = bet * 2;
          db.updateUser(userId, { credits: ud.credits - bet + bonusCredits, collection: col });
          return interaction.reply({ embeds: [new EmbedBuilder().setColor(tierColors[animalData.tier]||0xffd700).setTitle('🎰 JACKPOT!!').setDescription(`${display}\n\n🎉 JACKPOT! Kamu dapet ${animalData.emoji} **${animalData.name}** [${animalData.tier}] + **+${bonusCredits.toLocaleString()} ${creditName}**!`)] });
        }
      }
      if (s1.type === 'credits') {
        const win = bet * 3;
        db.updateUser(userId, { credits: ud.credits - bet + win });
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setTitle('🎰 MENANG!!').setDescription(`${display}\n\n💰 Kamu menang **+${win.toLocaleString()} ${creditName}**!`)] });
      }
    }

    // 2 sama = kembali taruhan
    if (s1.label === s2.label || s2.label === s3.label || s1.label === s3.label) {
      if (![s1,s2,s3].every(s => s.type === 'zonk')) {
        db.updateUser(userId, { credits: ud.credits - bet + bet });
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x95a5a6).setTitle('🎰 Hampir!').setDescription(`${display}\n\n😅 2 sama! Taruhan kamu **kembali** — tidak untung, tidak rugi.`)] });
      }
    }

    // Zonk
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x555555).setTitle('🎰 Zonk...').setDescription(`${display}\n\n💸 Sayang, gak ada yang cocok. Kamu kehilangan **-${bet.toLocaleString()} ${creditName}**`)] });
  }

  // /trivia
  else if (commandName === 'trivia') {
    if (triviaActive.has(userId)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Kamu masih punya trivia yang belum dijawab!')], ephemeral: true });

    const ud = db.getUser(userId);
    const diff = Date.now() - (ud.lastTrivia ? new Date(ud.lastTrivia).getTime() : 0);
    if (diff < TRIVIA_COOLDOWN) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`⏰ Tunggu **${formatTime(TRIVIA_COOLDOWN - diff)}** lagi.`)], ephemeral: true });

    db.updateUser(userId, { lastTrivia: new Date().toISOString() });
    const q = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];

    const timeout = setTimeout(() => {
      triviaActive.delete(userId);
      interaction.channel?.send({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`⏰ <@${userId}> Waktu habis! Jawaban yang benar: **${q.a}**`)] }).catch(()=>{});
    }, 30000);

    triviaActive.set(userId, { answer: q.a, timeout });

    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('🎮 Trivia Gaming!').setDescription(`**${q.q}**\n\nHint: \`${q.hint}\`\n\nKetik jawabanmu di chat! Waktu: **30 detik**`).setFooter({ text: `${botName} Trivia` })] });
  }

  // /birthday
  else if (commandName === 'birthday') {
    const ud = db.getUser(userId);
    const tanggal = interaction.options.getString('tanggal');

    if (!tanggal) {
      // Cek birthday
      if (!ud.birthday) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Kamu belum set birthday! Gunakan `/birthday tanggal:bulan-tanggal`')], ephemeral: true });
      const [bm, bd] = ud.birthday.split('-');
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff69b4).setDescription(`🎂 Birthday kamu: **${bd}/${bm}**`)] });
    }

    if (ud.birthday) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Birthday kamu sudah di-set dan tidak bisa diubah!')], ephemeral: true });

    const parts = tanggal.split('-');
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Format salah! Gunakan: `bulan-tanggal`, contoh: `5-13`')], ephemeral: true });
    }

    const month = parseInt(parts[0]), day = parseInt(parts[1]);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Tanggal tidak valid!')], ephemeral: true });
    }

    db.updateUser(userId, { birthday: `${month}-${day}` });
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff69b4).setTitle('🎂 Birthday Tersimpan!').setDescription(`Birthday kamu disimpan: **${day}/${month}**\nBot akan otomatis ngucapin + kasih bonus ${pointEmoji} **${BIRTHDAY_BONUS.toLocaleString()} ${pointName}** tiap tahun! 🎉`)] });
  }

  // /setbirthdaychannel
  else if (commandName === 'setbirthdaychannel') {
    const member = await guild.members.fetch(userId);
    if (!isAdmin(member)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Hanya admin!')], ephemeral: true });
    const channel = interaction.options.getChannel('channel');
    birthdayChannelId = channel.id;
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Birthday channel diset ke ${channel}!`)] });
  }

  // /remind
  else if (commandName === 'remind') {
    const ud = db.getUser(userId);
    const current = ud.remindEnabled || false;
    db.updateUser(userId, { remindEnabled: !current });
    interaction.reply({ embeds: [new EmbedBuilder().setColor(!current ? 0x57f287 : 0xff4444).setDescription(!current ? '✅ Reminder **aktif**! Bot akan DM kamu saat daily & weekly bisa di-claim.' : '❌ Reminder **dimatikan**.')] });
  }

  // /rob
  else if (commandName === 'rob') {
    const target = interaction.options.getUser('target');
    const ud = db.getUser(userId);
    const td = db.getUser(target.id);
    if (target.id === userId) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Gak bisa rob diri sendiri!')], ephemeral: true });
    try { const tm = await guild.members.fetch(target.id); if (isInfinity(tm)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Target tidak bisa dirob!')], ephemeral: true }); } catch {}
    if (td.credits <= 0) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`❌ **${target.username}** credits nya 0 atau minus!`)], ephemeral: true });
    if (ud.credits <= 0) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Credits kamu 0 atau minus, gak bisa rob!')], ephemeral: true });
    const diff = Date.now() - (ud.lastRob ? new Date(ud.lastRob).getTime() : 0);
    if (diff < ROB_COOLDOWN) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`⏰ Tunggu **${formatTime(ROB_COOLDOWN - diff)}** lagi.`)], ephemeral: true });
    db.updateUser(userId, { lastRob: new Date().toISOString() });
    if (Math.random() < 0.65) {
      const fine = rand(1000,5000), cf = rand(200,1000);
      db.updateUser(userId, { points: ud.points-fine, credits: ud.credits-cf });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setTitle('🚔 Ketangkep!').setDescription(`Ketangkep rob **${target.username}**!\n💥 Denda: **-${fine.toLocaleString()} ${pointName}** + **-${cf.toLocaleString()} ${creditName}**!`)] });
    }
    const robAmount = Math.floor(td.credits * (rand(10,40)/100));
    db.updateUser(userId, { credits: ud.credits+robAmount });
    db.updateUser(target.id, { credits: td.credits-robAmount });
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('💰 Rob Berhasil!').setDescription(`Berhasil rampok **${target.username}**!\nDapat **+${robAmount.toLocaleString()} ${creditName}**! 🏃`)] });
  }

  // /robhunt
  else if (commandName === 'robhunt') {
    const target = interaction.options.getUser('target');
    const ud = db.getUser(userId);
    const td = db.getUser(target.id);
    if (target.id === userId) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Gak bisa rob diri sendiri!')], ephemeral: true });
    try { const tm = await guild.members.fetch(target.id); if (isInfinity(tm)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Target tidak bisa di-rob!')], ephemeral: true }); } catch {}
    const targetCol = td.collection || {};
    const owned = Object.entries(targetCol).filter(([,c])=>c>0);
    if (!owned.length) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`❌ **${target.username}** koleksinya kosong!`)], ephemeral: true });
    const diff = Date.now() - (ud.lastRobHunt ? new Date(ud.lastRobHunt).getTime() : 0);
    if (diff < ROBHUNT_COOLDOWN) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`⏰ Tunggu **${formatTime(ROBHUNT_COOLDOWN - diff)}** lagi.`)], ephemeral: true });
    db.updateUser(userId, { lastRobHunt: new Date().toISOString() });
    if (Math.random() < 0.75) {
      const fine = rand(2000,8000), cf = rand(500,2000);
      db.updateUser(userId, { points: ud.points-fine, credits: ud.credits-cf });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setTitle('🚔 Ketangkep Nyuri!').setDescription(`Kepergok nyuri dari **${target.username}**!\n💥 Denda: **-${fine.toLocaleString()} ${pointName}** + **-${cf.toLocaleString()} ${creditName}**!`)] });
    }
    const [sName] = owned[Math.floor(Math.random()*owned.length)];
    const sAnimal = allCreatures.find(a=>a.name===sName)||{emoji:'🐾',tier:'Basic'};
    targetCol[sName]--; if(targetCol[sName]<=0) delete targetCol[sName];
    db.updateUser(target.id, { collection: targetCol });
    const myCol = ud.collection||{}; myCol[sName]=(myCol[sName]||0)+1;
    db.updateUser(userId, { collection: myCol });
    interaction.reply({ embeds: [new EmbedBuilder().setColor(tierColors[sAnimal.tier]||0x57f287).setTitle('🥷 Rob Berhasil!').setDescription(`Berhasil nyuri ${sAnimal.emoji} **${sName}** [${sAnimal.tier}] dari **${target.username}**! 🏃💨`)] });
  }

  // /giveanimal
  else if (commandName === 'giveanimal') {
    const target = interaction.options.getUser('user');
    const hewanInput = interaction.options.getString('hewan').trim().toLowerCase();
    const ud = db.getUser(userId);
    const col = ud.collection || {};
    if (target.id === userId) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Gak bisa kasih ke diri sendiri!')], ephemeral: true });
    const matched = allCreatures.find(a=>a.name.toLowerCase()===hewanInput);
    if (!matched) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`❌ Hewan **${hewanInput}** tidak ditemukan!`)], ephemeral: true });
    if (!col[matched.name]||col[matched.name]<=0) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`❌ Kamu gak punya **${matched.name}** di koleksi!`)], ephemeral: true });
    col[matched.name]--; if(col[matched.name]<=0) delete col[matched.name];
    db.updateUser(userId, { collection: col });
    const tc = db.getUser(target.id).collection||{}; tc[matched.name]=(tc[matched.name]||0)+1;
    db.updateUser(target.id, { collection: tc });
    interaction.reply({ embeds: [new EmbedBuilder().setColor(tierColors[matched.tier]||0x57f287).setTitle('🎁 Hewan Dikirim!').setDescription(`**${user.username}** mengasih ${matched.emoji} **${matched.name}** [${matched.tier}] ke **${target.username}**!`)] });
  }

  // /leaderboard
  else if (commandName === 'leaderboard') {
    const allUsers = Object.entries(db.getAllUsers()).sort((a,b)=>b[1].points-a[1].points);
    const lines = []; let rank = 0;
    for (const [id,data] of allUsers) {
      if (lines.length>=10) break;
      let name; try { const m=await guild.members.fetch(id); if(isInfinity(m)) continue; name=m.user.username; } catch { continue; }
      rank++;
      lines.push(`${rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':`${rank}.`} **${name}** — ${pointEmoji} ${data.points.toLocaleString()}`);
    }
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setTitle(`🏆 TOP LEADERBOARD — ${pointName}`).setDescription(lines.join('\n')||'Belum ada data.').setFooter({text:`${botName} | ${new Date().toLocaleString('id-ID')}`})] });
  }

  // /top
  else if (commandName === 'top') {
    const allUsers = Object.entries(db.getAllUsers()).sort((a,b)=>b[1].credits-a[1].credits);
    const lines = []; let rank = 0;
    for (const [id,data] of allUsers) {
      if (lines.length>=10) break;
      let name; try { const m=await guild.members.fetch(id); if(isInfinity(m)) continue; name=m.user.username; } catch { continue; }
      rank++;
      const cs = data.credits<0?`-${Math.abs(data.credits).toLocaleString()} 🔴`:data.credits.toLocaleString();
      lines.push(`${rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':`${rank}.`} **${name}** — ${creditEmoji} ${cs}`);
    }
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle(`💰 TOP LEADERBOARD — ${creditName}`).setDescription(lines.join('\n')||'Belum ada data.').setFooter({text:`${botName} | ${new Date().toLocaleString('id-ID')}`})] });
  }

  // /give
  else if (commandName === 'give') {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('jumlah');
    const ud = db.getUser(userId);
    if (target.id===userId) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Gak bisa kasih ke diri sendiri!')], ephemeral: true });
    if (ud.points<amount) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Poin kamu gak cukup!')], ephemeral: true });
    db.updateUser(userId, { points: ud.points-amount });
    db.updateUser(target.id, { points: db.getUser(target.id).points+amount });
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`${pointEmoji} **${user.username}** kasih **${amount.toLocaleString()} ${pointName}** ke **${target.username}**!`)] });
  }

  // /shop
  else if (commandName === 'shop') {
    const lines = shopItems.map(i=>`${i.emoji} **${i.name}** — ${pointEmoji} ${i.price.toLocaleString()} ${pointName}\n> ${i.desc}`).join('\n\n');
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('🛒 Toko XML Point').setDescription(lines).setFooter({text:'Hubungi admin untuk penukaran point'})] });
  }

  // /addpoints
  else if (commandName === 'addpoints') {
    const member = await guild.members.fetch(userId);
    if (!isAdmin(member)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Kamu gak punya role yang diperlukan!')], ephemeral: true });
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('jumlah');
    db.updateUser(target.id, { points: db.getUser(target.id).points+amount });
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Berhasil tambah ${pointEmoji} **${amount.toLocaleString()} ${pointName}** ke **${target.username}**`)] });
  }

  // /removepoints
  else if (commandName === 'removepoints') {
    const member = await guild.members.fetch(userId);
    if (!isAdmin(member)) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Kamu gak punya role yang diperlukan!')], ephemeral: true });
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('jumlah');
    db.updateUser(target.id, { points: db.getUser(target.id).points-amount });
    interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`✅ Berhasil kurangi ${pointEmoji} **${amount.toLocaleString()} ${pointName}** dari **${target.username}**`)] });
  }
});

client.login(TOKEN);
