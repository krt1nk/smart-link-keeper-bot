const OpenAI = require('openai');
const { withRetry, parseAIResponse, measureExecution } = require('./utils');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


async function generateMetadata({ title, description, content, keywords, url }) {
  return measureExecution(async () => {
    const isRussian = /[а-яА-ЯёЁ]/.test(title + description + content);
    
    const prompt = `
Analyze this web page and create metadata in JSON format.

IMPORTANT: You MUST provide at least 3-5 tags, even for simple content.

Requirements:
- summary: brief description (1-3 sentences) in ${isRussian ? 'Russian' : 'English'}
- category: single category (e.g., "технологии", "наука", "маркетинг", "разработка", "новости", "видео", "музыка", "развлечения", "образование", etc.)
- tags: array of 5-10 SHORT tags (single words or 2-word phrases) in ${isRussian ? 'Russian' : 'English'}
- keywords: array of up to 10 keywords in ${isRussian ? 'Russian' : 'English'}

For YouTube videos:
- category should be "видео" or "video"
- tags should include: genre, artist/channel name, topic
- Example tags: ["музыка", "хип-хоп", "playboi_carti", "клип", "rap"]

Data:
URL: ${url}
Title: ${title}
Description: ${description}
Keywords: ${keywords}
Content: ${content.slice(0, 3000)}

Return ONLY valid JSON. No markdown, no comments.

Example output:
{
  "summary": "Музыкальный клип Playboi Carti - Sky",
  "category": "видео",
  "tags": ["музыка", "рэп", "playboi_carti", "клип", "хип-хоп"],
  "keywords": ["playboi carti", "sky", "music video", "rap", "hip-hop"]
}
`;

    const response = await withRetry(async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an AI that creates precise metadata. ALWAYS include at least 3-5 relevant tags.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      });

      return completion.choices[0].message.content;
    });

    const data = parseAIResponse(response);

    let tags = Array.isArray(data.tags) ? data.tags : [];
    if (tags.length === 0) {
      console.warn('⚠️ AI returned no tags, generating fallback tags');
      const titleWords = title.toLowerCase()
        .replace(/[^\wа-яё\s-]/gi, '')
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 3);
      
      tags = [
        data.category || 'другое',
        ...titleWords,
        url.includes('youtube') ? 'видео' : '',
        url.includes('youtu') ? 'youtube' : ''
      ].filter(Boolean);
    }

    return {
      summary: data.summary || description || 'Описание недоступно',
      category: data.category || 'другое',
      tags: tags.slice(0, 10),
      keywords: Array.isArray(data.keywords) ? data.keywords : [],
    };
  }, 'generateMetadata');
}

module.exports = { generateMetadata };