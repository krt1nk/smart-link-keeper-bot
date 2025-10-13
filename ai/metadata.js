const OpenAI = require('openai');
const { withRetry, parseAIResponse, measureExecution } = require('./utils');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


async function generateMetadata({ title, description, content, keywords, url }) {
  return measureExecution(async () => {
    const prompt = `
Ты — умный помощник, который анализирует контент веб-страницы.
На основе данных создай краткие метаданные в формате JSON.

Требования:
- summary: одно короткое понятное резюме (1-3 предложения)
- category: одна категория (например: "технологии", "наука", "маркетинг", "разработка", "новости", "видео", "личное", "искусство" и т.п.)
- tags: список до 10 коротких тегов (в виде массива строк)
- keywords: список ключевых слов (до 10)

Верни только JSON. Без комментариев и лишнего текста.

Данные:
URL: ${url}
Заголовок: ${title}
Описание: ${description}
Ключевые слова: ${keywords}
Текст: ${content.slice(0, 3000)}
`;

    const response = await withRetry(async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Ты AI, который создаёт чёткие метаданные по контенту.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
      });

      return completion.choices[0].message.content;
    });

    const data = parseAIResponse(response);

    return {
      summary: data.summary || 'Описание недоступно',
      category: data.category || 'другое',
      tags: Array.isArray(data.tags) ? data.tags : [],
      keywords: Array.isArray(data.keywords) ? data.keywords : [],
    };
  }, 'generateMetadata');
}

module.exports = { generateMetadata };
