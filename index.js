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
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id, title, category, tags FROM links WHERE user_id = ? AND url = ?',
      [userId, url],
      async (err, existing) => {
        if (err) {
          console.error('❌ DB check error:', err);
          reject(err);
          return;
        }

        if (existing) {
          console.log('⚠️ Link already exists, id:', existing.id);
          resolve({ 
            title: existing.title,
            metadata: {
              category: existing.category,
              tags: existing.tags ? existing.tags.split(', ') : [],
              summary: 'Already saved'
            },
            userNote,
            alreadyExists: true
          });
          return;
        }

        try {
          console.log('🔍 Fetching content for:', url);
          const { title, description, content, keywords } = await fetchPageContent(url);
          console.log('✅ Content fetched:', { 
            title: title.substring(0, 50), 
            descLen: description.length,
            contentLen: content.length 
          });
          
          console.log('🤖 Generating metadata...');
          const metadata = await generateMetadata({ title, description, content, keywords, url });
          console.log('✅ Metadata generated:', {
            category: metadata.category,
            tagsCount: metadata.tags.length,
            tags: metadata.tags,
            summaryLen: metadata.summary.length
          });

          const finalDescription = userNote
            ? `${userNote}\n\n--- Auto-description ---\n${metadata.summary}`
            : metadata.summary;

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
            function(err) {
              if (err) {
                console.error('❌ DB insert error:', err);
                reject(err);
              } else {
                console.log('✅ Link saved to DB with id:', this.lastID);
                resolve({ title, metadata, userNote, alreadyExists: false });
              }
            }
          );
        } catch (error) {
          console.error('❌ saveLink error:', error);
          reject(error);
        }
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

        console.log(`🔍 Search query: "${query}" | Total links: ${rows.length}`);

        try {
          const indices = await smartSearchAI({ query, links: rows });
          
          if (!indices.length) {
            console.warn('⚠️ AI returned no results, trying fallback search');
            const fallback = rows.filter(r => {
              const searchText = [
                r.title || '',
                r.description || '',
                r.tags || '',
                r.keywords || '',
                r.url || ''
              ].join(' ').toLowerCase();
              
              const queryWords = query.toLowerCase().split(/\s+/);
              return queryWords.some(word => searchText.includes(word));
            });
            
            console.log(`📋 Fallback found ${fallback.length} results`);
            resolve(fallback.slice(0, 10));
            return;
          }

          const results = indices.map(i => rows[i]).filter(Boolean);
          console.log(`✅ AI search found ${results.length} results`);
          resolve(results);
        } catch (error) {
          console.error('❌ AI search error:', error.message);

          const fallback = rows.filter(r => {
            const searchText = [
              r.title || '',
              r.description || '',
              r.tags || '',
              r.keywords || '',
              r.url || ''
            ].join(' ').toLowerCase();
            
            const queryWords = query.toLowerCase().split(/\s+/);
            return queryWords.some(word => searchText.includes(word));
          });
          
          console.log(`📋 Error fallback found ${fallback.length} results`);
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

bot.command('debug', async (ctx) => {
  const userId = ctx.from.id;
  
  db.all(
    'SELECT id, title, category, tags, LENGTH(description) as desc_len, LENGTH(content) as content_len FROM links WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
    [userId],
    (err, rows) => {
      if (err) {
        return ctx.reply('❌ DB error: ' + err.message);
      }
      
      if (rows.length === 0) {
        return ctx.reply('🔍 No links found in DB for your user_id: ' + userId);
      }

      let msg = `🔍 DEBUG INFO (user_id: ${userId})\n\nLast ${rows.length} links:\n\n`;
      rows.forEach((r, i) => {
        msg += `${i + 1}. ID: ${r.id}\n`;
        msg += `   Title: ${r.title?.substring(0, 50) || 'NULL'}\n`;
        msg += `   Category: ${r.category || 'NULL'}\n`;
        msg += `   Tags: ${r.tags || 'NULL'}\n`;
        msg += `   Desc length: ${r.desc_len || 0}\n`;
        msg += `   Content length: ${r.content_len || 0}\n\n`;
      });
      
      ctx.reply(msg.substring(0, 4000));
    }
  );
});

bot.command('cleanup', async (ctx) => {
  const userId = ctx.from.id;
  
  db.all(
    `SELECT url, COUNT(*) as count, GROUP_CONCAT(id) as ids 
     FROM links 
     WHERE user_id = ? 
     GROUP BY url 
     HAVING count > 1`,
    [userId],
    (err, duplicates) => {
      if (err) {
        return ctx.reply('❌ Ошибка проверки дубликатов');
      }
      
      if (duplicates.length === 0) {
        return ctx.reply('✅ Дубликатов не найдено!');
      }
      
      let deleted = 0;
      let promises = [];
      
      duplicates.forEach(dup => {
        const ids = dup.ids.split(',').map(Number);
        const keepId = Math.min(...ids);
        const deleteIds = ids.filter(id => id !== keepId);
        
        deleteIds.forEach(id => {
          promises.push(new Promise((resolve) => {
            db.run('DELETE FROM links WHERE id = ?', [id], () => {
              deleted++;
              resolve();
            });
          }));
        });
      });
      
      Promise.all(promises).then(() => {
        ctx.reply(`🧹 Удалено ${deleted} дубликатов!\n\n` +
          `Найдено групп дубликатов: ${duplicates.length}\n` +
          `Оставлены самые старые версии.`);
      });
    }
  );
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
      const result = await saveLink(userId, url, userNote);
      
      if (result.alreadyExists) {
        const tagString = result.metadata.tags.length > 0
          ? result.metadata.tags.slice(0, 8).map(tag => `#${tag.replace(/\s/g, '_')}`).join(' ')
          : 'нет тегов';
        
        const response = '⚠️ Эта ссылка уже сохранена!\n\n' +
          t(userId, 'link.title', result.title) +
          t(userId, 'link.category', result.metadata.category) +
          t(userId, 'link.tags') + tagString;
        
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, response);
        return;
      }

      const { title, metadata, userNote: savedNote } = result;
      
      let response = t(userId, 'link.saved') +
        t(userId, 'link.title', title) +
        t(userId, 'link.category', metadata.category);
      
      if (metadata.tags && metadata.tags.length > 0) {
        const tagString = metadata.tags
          .slice(0, 8)
          .map(tag => `#${tag.replace(/\s/g, '_')}`)
          .join(' ');
        response += t(userId, 'link.tags') + tagString;
      } else {
        response += t(userId, 'link.tags') + 'нет тегов';
      }
      
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