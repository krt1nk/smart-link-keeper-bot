# Installation Guide

## Prerequisites

Before you begin, ensure you have:

- **Node.js** version 18 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Telegram account**
- **OpenAI account** with API access

## Step 1: Get Telegram Bot Token

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Follow the instructions:
   - Choose a name for your bot (e.g., "My Link Keeper")
   - Choose a username (must end with 'bot', e.g., "my_link_keeper_bot")
4. Copy the token provided (format: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. **Important**: Keep this token secret!

## Step 2: Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy the key (starts with `sk-proj-...`)
6. **Important**: You won't be able to see it again!

### Pricing Note

This bot uses `gpt-4o-mini` model which is very cost-effective:
- ~$0.15 per 1M input tokens
- ~$0.60 per 1M output tokens

For typical usage (analyzing 100 links per day), monthly cost is usually under $1.

## Step 3: Download and Install

### Option A: Clone from GitHub (Recommended)

```bash
# Clone the repository
git clone https://github.com/krt1nk/smart-link-keeper-bot.git
cd smart-link-keeper-bot

# Install dependencies
npm install
```

### Option B: Manual Download

1. Download the repository as ZIP
2. Extract to a folder
3. Open terminal/command prompt in that folder
4. Run: `npm install`

## Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` file and add your tokens:
```env
TELEGRAM_BOT_TOKEN=paste_your_telegram_token_here
OPENAI_API_KEY=paste_your_openai_key_here
```

**Windows users**: Use Notepad or any text editor to create `.env` file

## Step 5: Run the Bot

### For Production:
```bash
npm start
```

### For Development (auto-restart on changes):
```bash
npm run dev
```

You should see:
```
🤖 Bot started and ready
```

## Step 6: Test Your Bot

1. Open Telegram
2. Search for your bot by username
3. Send `/start` command
4. Try sending a link!

## Troubleshooting

### "Cannot find module 'telegraf'"
**Solution**: Run `npm install` in the project folder

### "TELEGRAM_BOT_TOKEN not found"
**Solution**: Make sure `.env` file exists and contains valid token

### "Error: 401 Unauthorized"
**Solution**: Check if your Telegram bot token is correct

### "OpenAI API error"
**Solution**: 
- Verify your OpenAI API key is correct
- Check if you have credits in your OpenAI account
- Visit [OpenAI Billing](https://platform.openai.com/account/billing)

### Bot doesn't respond
**Solution**:
- Make sure the bot process is running
- Check console for error messages
- Try `/start` command again


### Backup Database
```bash
cp links.db links.db.backup
```

### Restore Database
```bash
cp links.db.backup links.db
```

## Need Help?

- 📖 Check [README.md](README.md) for general info
- 🐛 Report issues on [GitHub Issues](https://github.com/your-username/smart-link-keeper-bot/issues)
- 💬 Join our community discussions

---

**Congratulations! Your Smart Link Keeper Bot is ready! 🎉**