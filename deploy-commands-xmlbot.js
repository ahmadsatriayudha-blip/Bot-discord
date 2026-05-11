// deploy-commands.js
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const { token, clientId, guildId } = require('./config');

const commands = [
  new SlashCommandBuilder().setName('daily').setDescription('Claim poin harian kamu'),
  new SlashCommandBuilder().setName('weekly').setDescription('Claim poin mingguan kamu'),
  new SlashCommandBuilder().setName('balance').setDescription('Cek saldo XML Point kamu'),
  new SlashCommandBuilder().setName('hunt').setDescription('Berburu hewan untuk dapet Credits'),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Top ranking server'),
  new SlashCommandBuilder()
    .setName('give')
    .setDescription('Kasih poin ke user lain')
    .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
    .addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah poin').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Lihat toko penukaran point'),
  new SlashCommandBuilder()
    .setName('addpoints')
    .setDescription('[ADMIN] Tambah poin ke user')
    .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
    .addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah poin').setRequired(true)),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log('✅ Slash commands registered!');
  } catch (err) {
    console.error(err);
  }
})();
