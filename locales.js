// locales.js - Языковые переводы

const locales = {
    en: {
      start: {
        greeting: (name) => `👋 Hello, ${name}!\n\nI'm your personal smart link keeper.\n\n📎 Send a link:\n• Just a URL: https://example.com\n• URL with a note: https://example.com\nMy note about something important\n\n🔍 To search, just write a query:\n"Find videos about cooking"\n"AI from Google"\n\n📊 /stats — your link statistics\n🌐 /language — change language\n\n🔒 All your links are private, only you can see them.`
      },
      stats: {
        title: '📊 Your Statistics:\n\n',
        total: (count) => `🔗 Total links: ${count}\n\n`,
        categories: '📂 By categories:\n',
        category: (name, count) => `   • ${name}: ${count}\n`,
        empty: '📊 You don\'t have any saved links yet.\n\nSend me any link to start!'
      },
      link: {
        processing: '⏳ Loading and analyzing the page...',
        saved: '✅ Link saved!\n\n',
        title: (title) => `📌 ${title}\n\n`,
        category: (cat) => `🏷 Category: ${cat}\n\n`,
        tags: '🔖 Tags:\n',
        yourNote: (note) => `\n\n📝 Your note:\n${note}`,
        error: '❌ Error processing link. Please try again.'
      },
      search: {
        searching: '🔍 Searching for your query...',
        found: '🎯 Found:\n\n',
        result: (i, cat, title, tags, url) => 
          `${i + 1}. [${(cat || 'other').toUpperCase()}] ${title || 'Untitled'}\n🏷 ${tags || 'no tags'}\n🔗 ${url}`,
        withNote: (note) => `\n📝 ${note}`,
        notFound: '😕 Nothing found. Try changing your query.',
        error: '❌ Search error.'
      },
      language: {
        select: '🌐 Select language / Выберите язык:',
        changed: (lang) => `✅ Language changed to ${lang === 'en' ? 'English' : 'Русский'}!`
      },
      errors: {
        stats: '❌ Error retrieving statistics',
        database: '❌ Database error'
      }
    },
    ru: {
      start: {
        greeting: (name) => `👋 Привет, ${name}!\n\nЯ твой личный умный хранитель ссылок.\n\n📎 Отправь ссылку:\n• Просто ссылку: https://example.com\n• Ссылку с описанием: https://example.com\nМоя заметка о чём-то важном\n\n🔍 Для поиска просто напиши запрос:\n"Найди видео про готовку"\n"AI от Google"\n\n📊 /stats — статистика твоих ссылок\n🌐 /language — сменить язык\n\n🔒 Все твои ссылки приватные, только ты их видишь.`
      },
      stats: {
        title: '📊 Твоя статистика:\n\n',
        total: (count) => `🔗 Всего ссылок: ${count}\n\n`,
        categories: '📂 По категориям:\n',
        category: (name, count) => `   • ${name}: ${count}\n`,
        empty: '📊 У тебя пока нет сохранённых ссылок.\n\nОтправь мне любую ссылку для начала!'
      },
      link: {
        processing: '⏳ Загружаю и анализирую страницу...',
        saved: '✅ Ссылка сохранена!\n\n',
        title: (title) => `📌 ${title}\n\n`,
        category: (cat) => `🏷 Категория: ${cat}\n\n`,
        tags: '🔖 Теги:\n',
        yourNote: (note) => `\n\n📝 Твоя заметка:\n${note}`,
        error: '❌ Ошибка при обработке ссылки. Попробуй ещё раз.'
      },
      search: {
        searching: '🔍 Ищу по твоему запросу...',
        found: '🎯 Найдено:\n\n',
        result: (i, cat, title, tags, url) => 
          `${i + 1}. [${(cat || 'другое').toUpperCase()}] ${title || 'Без названия'}\n🏷 ${tags || 'нет тегов'}\n🔗 ${url}`,
        withNote: (note) => `\n📝 ${note}`,
        notFound: '😕 Ничего не найдено. Попробуй изменить запрос.',
        error: '❌ Ошибка поиска.'
      },
      language: {
        select: '🌐 Select language / Выберите язык:',
        changed: (lang) => `✅ Язык изменён на ${lang === 'en' ? 'English' : 'Русский'}!`
      },
      errors: {
        stats: '❌ Ошибка получения статистики',
        database: '❌ Ошибка базы данных'
      }
    }
  };
  
  // Получить перевод для пользователя
  function t(userId, key, ...args) {
    const userLang = getUserLanguage(userId);
    const keys = key.split('.');
    let value = locales[userLang];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    if (typeof value === 'function') {
      return value(...args);
    }
    
    return value || key;
  }
  
  // Хранилище языков пользователей (в продакшене лучше использовать БД)
  const userLanguages = new Map();
  
  function getUserLanguage(userId) {
    return userLanguages.get(userId) || 'en';
  }
  
  function setUserLanguage(userId, lang) {
    userLanguages.set(userId, lang);
  }
  
  module.exports = {
    t,
    getUserLanguage,
    setUserLanguage,
    locales
  };