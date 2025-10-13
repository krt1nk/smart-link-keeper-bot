# 🔗 Smart Link Keeper Bot

> Intelligent Telegram bot for saving and searching links with AI-powered content analysis

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Telegram](https://img.shields.io/badge/Telegram-Bot-blue.svg)](https://telegram.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-orange.svg)](https://openai.com/)

## 📖 About

Smart Link Keeper Bot is an intelligent assistant for managing your bookmarks directly in Telegram. The bot automatically analyzes page content, generates tags and categories, and provides smart search based on query semantics.

### ✨ Key Features

- 🤖 **AI Content Analysis** — automatic generation of descriptions, tags, and categories
- 🔍 **Smart Search** — semantic search, not just keyword matching
- 📝 **Personal Notes** — add your own comments to links
- 🎬 **YouTube Support** — special handling for videos with metadata extraction
- 📊 **Statistics** — track saved links by categories
- 🌐 **Multi-language** — English and Russian interface with easy switching
- 🔒 **Privacy** — all data stored locally, each user sees only their own links

## 🚀 Quick Start

### Requirements

- Node.js 18+
- Telegram Bot Token ([get from @BotFather](https://t.me/BotFather))
- OpenAI API Key ([get here](https://platform.openai.com/api-keys))

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/your-username/smart-link-keeper-bot.git
cd smart-link-keeper-bot
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**

Create a `.env` file in the root folder:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
OPENAI_API_KEY=your_openai_api_key_here
```

4. **Start the bot:**
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## 📁 Project Structure

```
smart-link-keeper-bot/
├── ai/
│   ├── metadata.js      # AI metadata generation
│   ├── search.js        # Smart search
│   └── utils.js         # Utility functions
├── bot.js               # Main bot file
├── locales.js           # Language translations
├── package.json
├── .env.example         # Configuration example
├── .gitignore
└── README.md
```

## 💡 Usage

### Saving Links

**Just send a URL:**
```
https://example.com
```

**With a personal note:**
```
https://example.com
Interesting article about AI, read later
```

The bot will automatically:
- Fetch the page
- Extract title, description, and content
- Generate category and tags via AI
- Save to local database

### Searching Links

Simply write a query in natural language:

```
Find articles about artificial intelligence
```

```
Cooking videos
```

```
Google articles
```

AI will understand the query meaning and find the most relevant links.

### Changing Language

Use `/language` command to switch between English and Russian interface. Your language preference is saved automatically.

### Commands

- `/start` — greeting and instructions
- `/stats` — statistics by categories
- `/language` — change interface language (English/Russian)

## 🛠️ Technologies

- **[Telegraf](https://telegraf.js.org/)** — framework for Telegram bots
- **[OpenAI GPT-4o-mini](https://openai.com/)** — content analysis and search
- **[Cheerio](https://cheerio.js.org/)** — HTML parsing
- **[SQLite](https://www.sqlite.org/)** — local data storage
- **[Axios](https://axios-http.com/)** — HTTP requests
- **[dotenv](https://github.com/motdotla/dotenv)** — environment variable management

## 🔧 Configuration

### AI Models

By default, `gpt-4o-mini` is used. You can change the model in files:
- `ai/metadata.js`
- `ai/search.js`

### Database

Data is stored in `links.db` file (SQLite). Table structures:

**Links table:**
```sql
CREATE TABLE links (
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
```

**User settings table:**
```sql
CREATE TABLE user_settings (
  user_id INTEGER PRIMARY KEY,
  language TEXT DEFAULT 'en'
)
```

## 🤝 Contributing

All improvements are welcome! If you want to contribute:

1. Fork the repository
2. Create a branch for the new feature (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Roadmap

- [ ] Export links to various formats (JSON, CSV, HTML)
- [ ] Support for folders and collections
- [ ] Web interface for viewing links
- [ ] Integration with other services (Notion, Pocket)
- [ ] Shared link collections
- [ ] Reminders for unread links

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

## 👤 Author

Created with ❤️ 

---

**⭐ If you liked the project, give it a star on GitHub!**