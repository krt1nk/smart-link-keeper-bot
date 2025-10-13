require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();
const { generateMetadata } = require('./ai/metadata');
const { smartSearchAI } = require('./ai/search');
const { t, setUserLanguage } = require('./locales');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in .env file');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const db = new sqlite3.Database('./links.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      title TEXT,
      description TEXT,
      category TEXT,
      tags TEXT,
      keywords TEXT,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      language TEXT DEFAULT 'en'
    )
  `);
});

function extractUrl(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex);
  return matches ? matches[0] : null;
}

function isUrl(text) {
  try {
    const url = new URL(text.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function fetchPageContent(url) {
  try {
    const { data } = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(data);
    $('script, style, nav, footer, header, iframe, noscript').remove();

    const title = $('title').first().text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('h1').first().text().trim() ||
      'Untitled';

    const description = $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      '';

    const keywords = $('meta[name="keywords"]').attr('content') || '';

    let videoInfo = '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoDesc = $('meta[name="description"]').attr('content') || '';
      const channelName = $('link[itemprop="name"]').attr('content') ||
        $('span[itemprop="author"] link[itemprop="name"]').attr('content') || '';
      videoInfo = `YouTube video. Channel: ${channelName}. ${videoDesc}`;
    }

    const mainContent = $('article, main, .content, #content, .post, [role="main"]').text().replace(/\s+/g, ' ').trim();
    const bodyContent = $('body').text().replace(/\s+/g, ' ').trim();
    const content = (videoInfo || mainContent || bodyContent).substring(0, 5000);

    return { 
      title: title.substring(0, 300),
      description: description.substring(0, 500),
      content,
      keywords
    };
  } catch (error) {
    console.error('Loading error:', error.message);
    return { title: 'Loading error', description: '', content: '', keywords: '' };
  }
}

async function saveLink(userId, url, userNote = '') {
  const { title, description, content, keywords } = await fetchPageContent(url);
  const metadata = await generateMetadata({ title, description, content, keywords, url });

  const finalDescription = userNote
    ? `${userNote}\n\n--- Auto-description ---\n${metadata.summary}`
    : metadata.summary;

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO links (user_id, url, title, description, category, tags, keywords, content) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        url,
        title,
        finalDescription,
        metadata.category,
        metadata.tags.join(', '),
        metadata.keywords.join(', '),
        content
      ],
      (err) => {
        if (err) reject(err);
        else resolve({ title, metadata, userNote });
      }
    );
  });
}

async function smartSearch(userId, query) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, url, title, description, category, tags, keywords, content FROM links WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
      async (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        if (rows.length === 0) {
          resolve([]);
          return;
        }

        try {
          const indices = await smartSearchAI({ query, links: rows });
          if (!indices.length) {
            resolve([]);
            return;
          }

          const results = indices.map(i => rows[i]);
          resolve(results);
        } catch (error) {
          console.error('AI search error:', error.message);

          const fallback = rows.filter(r => {
            const searchText = [
              r.title || '',
              r.description || '',
              r.tags || '',
              r.keywords || ''
            ].join(' ').toLowerCase();
            return searchText.includes(query.toLowerCase());
          });
          resolve(fallback.slice(0, 10));
        }
      }
    );
  });
}

function loadUserLanguage(userId) {
  return new Promise((resolve) => {
    db.get(
      'SELECT language FROM user_settings WHERE user_id = ?',
      [userId],
      (err, row) => {
        if (!err && row) {
          setUserLanguage(userId, row.language);
        }
        resolve();
      }
    );
  });
}

function saveUserLanguage(userId, language) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR REPLACE INTO user_settings (user_id, language) VALUES (?, ?)',
      [userId, language],
      (err) => {
        if (err) reject(err);
        else {
          setUserLanguage(userId, language);
          resolve();
        }
      }
    );
  });
}

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  await loadUserLanguage(userId);
  const userName = ctx.from.first_name || 'friend';
  ctx.reply(t(userId, 'start.greeting', userName));
});

bot.command('language', (ctx) => {
  const userId = ctx.from.id;
  ctx.reply(
    t(userId, 'language.select'),
    Markup.inlineKeyboard([
      [
        Markup.button.callback('🇬🇧 English', 'lang_en'),
        Markup.button.callback('🇷🇺 Русский', 'lang_ru')
      ]
    ])
  );
});

bot.action(/lang_(.+)/, async (ctx) => {
  const lang = ctx.match[1];
  const userId = ctx.from.id;
  
  await saveUserLanguage(userId, lang);
  await ctx.answerCbQuery();
  await ctx.editMessageText(t(userId, 'language.changed', lang));
});

bot.command('stats', async (ctx) => {
  const userId = ctx.from.id;
  await loadUserLanguage(userId);
  
  db.all(
    'SELECT category, COUNT(*) as count FROM links WHERE user_id = ? GROUP BY category',
    [userId],
    (err, categories) => {
      if (err) return ctx.reply(t(userId, 'errors.stats'));

      db.get('SELECT COUNT(*) as total FROM links WHERE user_id = ?', [userId], (err, row) => {
        if (err || !row) return ctx.reply(t(userId, 'errors.stats'));

        const total = row.total;
        if (total === 0) {
          ctx.reply(t(userId, 'stats.empty'));
          return;
        }

        let message = t(userId, 'stats.title') + t(userId, 'stats.total', total);
        if (categories.length > 0) {
          message += t(userId, 'stats.categories');
          categories.forEach(cat => {
            message += t(userId, 'stats.category', cat.category || 'other', cat.count);
          });
        }

        ctx.reply(message);
      });
    }
  );
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  const userId = ctx.from.id;
  await loadUserLanguage(userId);
  
  if (text.startsWith('/')) return;

  const extractedUrl = extractUrl(text);
  if (extractedUrl || isUrl(text)) {
    const url = extractedUrl || text;
    const userNote = extractedUrl ? text.replace(extractedUrl, '').trim() : '';

    const msg = await ctx.reply(t(userId, 'link.processing'));
    try {
      const { title, metadata, userNote: savedNote } = await saveLink(userId, url, userNote);
      const tagString = metadata.tags.slice(0, 8).map(tag => `#${tag.replace(/\s/g, '_')}`).join(' ');
      
      let response = t(userId, 'link.saved') +
        t(userId, 'link.title', title) +
        t(userId, 'link.category', metadata.category) +
        t(userId, 'link.tags') + tagString;
      
      if (savedNote) response += t(userId, 'link.yourNote', savedNote);

      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, response);
    } catch (error) {
      console.error(error);
      ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, t(userId, 'link.error'));
    }
  } else {
    const msg = await ctx.reply(t(userId, 'search.searching'));
    try {
      const results = await smartSearch(userId, text);
      if (!results.length) {
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, t(userId, 'search.notFound'));
        return;
      }

      const message = t(userId, 'search.found') + results.map((r, i) => {
        let result = t(userId, 'search.result', i, r.category, r.title, r.tags, r.url);
        
        if (r.description?.includes('\n\n--- Auto-description ---')) {
          const userNote = r.description.split('\n\n--- Auto-description ---')[0].trim();
          if (userNote) result += t(userId, 'search.withNote', userNote);
        }
        return result;
      }).join('\n\n');

      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, message.substring(0, 4000));
    } catch (error) {
      console.error(error);
      ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, t(userId, 'search.error'));
    }
  }
});

bot.launch();
console.log('🤖 Bot started and ready');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));