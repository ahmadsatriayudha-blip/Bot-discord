// index.js
const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { token, pointName, pointEmoji, creditName, creditEmoji, botName,
        dailyMin, dailyMax, weeklyMin, weeklyMax,
        dailyCooldownMs, weeklyCooldownMs, huntCooldownMs } = require('./config');
const db = require('./db');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

// ─── Hunt animals ────────────────────────────────────────────────────
const animals = [
  { name: 'Burung', emoji: '🐦', tier: 'Basic', min: 500, max: 1500 },
  { name: 'Ayam Hutan', emoji: '🐓', tier: 'Basic', min: 800, max: 1800 },
  { name: 'Bebek', emoji: '🦆', tier: 'Basic', min: 700, max: 1600 },
  { name: 'Kelinci', emoji: '🐰', tier: 'Common', min: 1000, max: 2500 },
  { name: 'Rusa', emoji: '🦌', tier: 'Common', min: 1500, max: 3000 },
  { name: 'Babi Hutan', emoji: '🐗', tier: 'Rare', min: 2000, max: 4000 },
  { name: 'Serigala', emoji: '🐺', tier: 'Rare', min: 2500, max: 5000 },
  { name: 'Harimau', emoji: '🐯', tier: 'Epic', min: 4000, max: 8000 },
  { name: 'Naga', emoji: '🐉', tier: 'Legendary', min: 8000, max: 15000 },
];

const enemies = [
  { name: 'Gorila', emoji: '🦍', min: 1000, max: 3000 },
  { name: 'Beruang', emoji: '🐻', min: 1500, max: 4000 },
  { name: 'Hiu', emoji: '🦈', min: 2000, max: 5000 },
];

// ─── Shop items ───────────────────────────────────────────────────────
const shopItems = [
  { id: 1, name: 'Custom Role', price: 100000, emoji: '🎭', desc: 'Dapetin role kustom di server' },
  { id: 2, name: 'VIP Badge', price: 50000, emoji: '⭐', desc: 'Badge VIP eksklusif' },
  { id: 3, name: 'Name Color', price: 30000, emoji: '🎨', desc: 'Warna nama kustom' },
];

// ─── Helpers ──────────────────────────────────────────────────────────
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatTime(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}j ${m}m`;
  if (m > 0) return `${m}m ${s}d`;
  return `${s}d`;
}

function getRank(userId) {
  const all = db.getAllUsers();
  const sorted = Object.entries(all).sort((a, b) => b[1].points - a[1].points);
  const idx = sorted.findIndex(([id]) => id === userId);
  return idx === -1 ? '—' : `#${idx + 1}`;
}

// ─── Ready ────────────────────────────────────────────────────────────
client.once('ready', () => {
  console.log(`✅ ${botName} Bot online: ${client.user.tag}`);
  client.user.setActivity(`${pointEmoji} ${pointName}`, { type: 3 });
});

// ─── Message XP (chat points) ─────────────────────────────────────────
client.on('messageCreate', msg => {
  if (msg.author.bot || !msg.guild) return;
  const user = db.getUser(msg.author.id);
  db.updateUser(msg.author.id, {
    chat: (user.chat || 0) + 1,
    points: user.points + rand(1, 5),
  });
});

// ─── Interactions ─────────────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, user, guild } = interaction;
  const userId = user.id;

  // ── /daily ──
  if (commandName === 'daily') {
    const userData = db.getUser(userId);
    const now = Date.now();
    const last = userData.lastDaily ? new Date(userData.lastDaily).getTime() : 0;
    const diff = now - last;

    if (diff < dailyCooldownMs) {
      const left = dailyCooldownMs - diff;
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xff4444)
          .setDescription(`⏰ Cooldown! Tunggu **${formatTime(left)}** lagi.`)],
        ephemeral: true
      });
    }

    const reward = rand(dailyMin, dailyMax);
    db.updateUser(userId, {
      points: userData.points + reward,
      lastDaily: new Date().toISOString(),
    });

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('✅ Daily Claimed!')
      .setDescription(`Reward: ${pointEmoji} **${reward.toLocaleString()} ${pointName}**`)
      .setFooter({ text: `${botName} System` });

    const row = {
      type: 1,
      components: [{
        type: 2, style: 1, label: '⏰ Ingatkan Saya',
        custom_id: 'remind_daily'
      }]
    };

    interaction.reply({ embeds: [embed], components: [row] });
  }

  // ── /weekly ──
  else if (commandName === 'weekly') {
    const userData = db.getUser(userId);
    const now = Date.now();
    const last = userData.lastWeekly ? new Date(userData.lastWeekly).getTime() : 0;
    const diff = now - last;

    if (diff < weeklyCooldownMs) {
      const left = weeklyCooldownMs - diff;
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xff4444)
          .setDescription(`⏰ Cooldown! Tunggu **${formatTime(left)}** lagi.`)],
        ephemeral: true
      });
    }

    const reward = rand(weeklyMin, weeklyMax);
    db.updateUser(userId, {
      points: userData.points + reward,
      lastWeekly: new Date().toISOString(),
    });

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('✅ Weekly Claimed!')
      .setDescription(`Reward: ${pointEmoji} **${reward.toLocaleString()} ${pointName}**`)
      .setFooter({ text: `${botName} System` });

    const row = {
      type: 1,
      components: [{
        type: 2, style: 1, label: '⏰ Ingatkan Minggu Depan',
        custom_id: 'remind_weekly'
      }]
    };

    interaction.reply({ embeds: [embed], components: [row] });
  }

  // ── /balance ──
  else if (commandName === 'balance') {
    const userData = db.getUser(userId);
    const rank = getRank(userId);
    const member = await guild.members.fetch(userId);
    const avatar = user.displayAvatarURL({ size: 128 });

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${pointEmoji} ${pointName}`)
      .setDescription(`**${user.username}**`)
      .setThumbnail(avatar)
      .addFields(
        { name: '🏆 Rank', value: rank, inline: true },
        { name: '💬 Chat', value: (userData.chat || 0).toLocaleString(), inline: true },
        { name: '\u200b', value: '\u200b', inline: true },
        { name: `${pointEmoji} Total`, value: `**${userData.points.toLocaleString()} ${pointName}**`, inline: true },
        { name: `${creditEmoji} Credits`, value: `${userData.credits.toLocaleString()}`, inline: true },
      )
      .setFooter({ text: `${botName} | ${new Date().toLocaleString('id-ID')}` });

    interaction.reply({ embeds: [embed] });
  }

  // ── /hunt ──
  else if (commandName === 'hunt') {
    const userData = db.getUser(userId);
    const now = Date.now();
    const last = userData.lastHunt ? new Date(userData.lastHunt).getTime() : 0;
    const diff = now - last;

    if (diff < huntCooldownMs) {
      const left = huntCooldownMs - diff;
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xff4444)
          .setDescription(`⏰ Cooldown berburu! Tunggu **${formatTime(left)}** lagi.`)],
        ephemeral: true
      });
    }

    db.updateUser(userId, { lastHunt: new Date().toISOString() });

    // 20% chance enemy attacks
    if (Math.random() < 0.2) {
      const enemy = enemies[Math.floor(Math.random() * enemies.length)];
      const loss = rand(enemy.min, enemy.max);
      const newCredits = Math.max(0, userData.credits - loss);
      db.updateUser(userId, { credits: newCredits });

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle('💀 Apes!')
          .setDescription(`Kamu diserang ${enemy.emoji} **${enemy.name}** dan kehilangan **-${loss.toLocaleString()} ${creditName}**!`)
          .setFooter({ text: `${botName} Hunt System` })]
      });
    }

    // Catch animal
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const gain = rand(animal.min, animal.max);
    db.updateUser(userId, { credits: userData.credits + gain });

    interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('🏹 Berhasil!')
        .setDescription(`Kamu menangkap ${animal.emoji} **${animal.name}** [${animal.tier}]\nDapat **+${gain.toLocaleString()} ${creditName}**!`)
        .setFooter({ text: `${botName} Hunt System` })]
    });
  }

  // ── /leaderboard ──
  else if (commandName === 'leaderboard') {
    const all = db.getAllUsers();
    const sorted = Object.entries(all)
      .sort((a, b) => b[1].points - a[1].points)
      .slice(0, 10);

    const lines = await Promise.all(sorted.map(async ([id, data], i) => {
      let name;
      try {
        const member = await guild.members.fetch(id);
        name = member.user.username;
      } catch {
        name = `User#${id.slice(-4)}`;
      }
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      return `${medal} **${name}** — ${pointEmoji} ${data.points.toLocaleString()}`;
    }));

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle(`🏆 TOP LEADERBOARD`)
      .setDescription(lines.join('\n') || 'Belum ada data.')
      .setFooter({ text: `${botName} | ${new Date().toLocaleString('id-ID')}` });

    interaction.reply({ embeds: [embed] });
  }

  // ── /give ──
  else if (commandName === 'give') {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('jumlah');
    const senderData = db.getUser(userId);

    if (target.id === userId) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Gak bisa kasih ke diri sendiri!')], ephemeral: true });
    if (senderData.points < amount) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Poin kamu gak cukup!')], ephemeral: true });

    const targetData = db.getUser(target.id);
    db.updateUser(userId, { points: senderData.points - amount });
    db.updateUser(target.id, { points: targetData.points + amount });

    interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x57f287)
        .setDescription(`${pointEmoji} **${user.username}** kasih **${amount.toLocaleString()} ${pointName}** ke **${target.username}**!`)]
    });
  }

  // ── /shop ──
  else if (commandName === 'shop') {
    const lines = shopItems.map(item =>
      `${item.emoji} **${item.name}** — ${pointEmoji} ${item.price.toLocaleString()} ${pointName}\n> ${item.desc}`
    ).join('\n\n');

    interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🛒 Toko XML Point')
        .setDescription(lines)
        .setFooter({ text: 'Hubungi admin untuk penukaran point' })]
    });
  }

  // ── /addpoints (admin) ──
  else if (commandName === 'addpoints') {
    const member = await guild.members.fetch(userId);
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription('❌ Hanya admin yang bisa pake command ini!')], ephemeral: true });
    }

    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('jumlah');
    const targetData = db.getUser(target.id);
    db.updateUser(target.id, { points: targetData.points + amount });

    interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x57f287)
        .setDescription(`✅ Berhasil tambah ${pointEmoji} **${amount.toLocaleString()} ${pointName}** ke **${target.username}**`)]
    });
  }
});

// ─── Button interactions ───────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'remind_daily') {
    interaction.reply({ content: `⏰ Oke! Aku akan ingatkan kamu besok untuk claim daily!`, ephemeral: true });
  } else if (interaction.customId === 'remind_weekly') {
    interaction.reply({ content: `⏰ Oke! Aku akan ingatkan kamu minggu depan untuk claim weekly!`, ephemeral: true });
  }
});

client.login(token);
