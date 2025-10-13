// === ./ai/search.js ===
const OpenAI = require('openai');
const { withRetry, parseAIResponse, measureExecution } = require('./utils');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function smartSearchAI({ query, links }) {
  return measureExecution(async () => {
    const context = links
      .map((l, i) => `${i}. ${l.title || 'Без названия'} — ${l.description || ''}\nТеги: ${l.tags || ''}\nКатегория: ${l.category || ''}`)
      .join('\n\n');

    const prompt = `
Ты — умный ассистент, который помогает искать нужные ссылки по смыслу.
Пользователь ввёл запрос: "${query}".

Вот список сохранённых ссылок:
${context}

Определи, какие из этих ссылок наиболее релевантны запросу.
Верни JSON формата:
{
  "indices": [список индексов, начиная с 0, максимум 5],
  "reasoning": "краткое объяснение выбора"
}
`;

    const response = await withRetry(async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Ты помогаешь делать смысловой поиск по списку ссылок.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      });

      return completion.choices[0].message.content;
    });

    const data = parseAIResponse(response);
    return Array.isArray(data.indices) ? data.indices : [];
  }, 'smartSearchAI');
}

module.exports = { smartSearchAI };
