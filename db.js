// db.js — Supabase database with memory cache
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Memory cache
let cache = {};
let initialized = false;

// Load all data from Supabase into cache
async function init() {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) { console.error('DB init error:', error); return; }
    cache = {};
    for (const row of data) {
      cache[row.user_id] = row.data;
    }
    initialized = true;
    console.log(`✅ DB loaded: ${Object.keys(cache).length} users`);
  } catch (err) {
    console.error('DB init failed:', err);
  }
}

// Auto-save to Supabase every 30 seconds
setInterval(async () => {
  if (!initialized) return;
  for (const [userId, data] of Object.entries(cache)) {
    try {
      await supabase.from('users').upsert({ user_id: userId, data });
    } catch (err) {
      console.error('Auto-save error:', err);
    }
  }
}, 30 * 1000);

function getUser(userId) {
  if (!cache[userId]) {
    cache[userId] = {
      points: 0,
      credits: 0,
      chat: 0,
      voice: 0,
      lastDaily: null,
      lastWeekly: null,
      lastHunt: null,
      lastFish: null,
      lastRob: null,
      lastRobHunt: null,
      lastSlots: null,
      lastTrivia: null,
      collection: {},
      birthday: null,
      remindEnabled: false,
    };
  }
  return cache[userId];
}

function updateUser(userId, data) {
  cache[userId] = { ...getUser(userId), ...data };
  // Write to Supabase async (fire and forget)
  supabase.from('users').upsert({ user_id: userId, data: cache[userId] })
    .then(({ error }) => { if (error) console.error('Save error:', error); })
    .catch(err => console.error('Save error:', err));
}

function getAllUsers() {
  return cache;
}

module.exports = { init, getUser, updateUser, getAllUsers };
