// db.js — simple JSON database
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

function load() {
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '{}');
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getUser(userId) {
  const db = load();
  if (!db[userId]) {
    db[userId] = {
      points: 0,
      credits: 0,
      chat: 0,
      lastDaily: null,
      lastWeekly: null,
      lastHunt: null,
    };
    save(db);
  }
  return db[userId];
}

function updateUser(userId, data) {
  const db = load();
  db[userId] = { ...getUser(userId), ...data };
  save(db);
}

function getAllUsers() {
  return load();
}

module.exports = { getUser, updateUser, getAllUsers };
