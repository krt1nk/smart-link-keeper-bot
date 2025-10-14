const OpenAI = require('openai');
const { withRetry, parseAIResponse, measureExecution } = require('./utils');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function smartSearchAI({ query, links }) {
  return measureExecution(async () => {
    const context = links
      .map((l, i) => {
        const parts = [
          `[${i}] ${l.title || 'Без названия'}`,
          l.description ? `Description: ${l.description.substring(0, 200)}` : '',
          l.tags ? `Tags: ${l.tags}` : '',
          l.keywords ? `Keywords: ${l.keywords}` : '',
          l.category ? `Category: ${l.category}` : '',
          `URL: ${l.url}`
        ].filter(Boolean);
        return parts.join('\n');
      })
      .join('\n\n---\n\n');

    console.log(`🔍 Searching "${query}" among ${links.length} links`);

    const prompt = `You are a smart semantic search assistant.

User query: "${query}"

Find the MOST RELEVANT links from this list. Consider:
- Title and description content
- Tags and keywords  
- Semantic meaning (not just exact word match)
- Category relevance

Links database:
${context}

Return JSON with:
{
  "indices": [array of relevant link indices from 0 to ${links.length - 1}, maximum 5 most relevant],
  "reasoning": "brief explanation in English"
}

IMPORTANT: 
- Return at least 1-3 indices if ANY link is somewhat relevant
- Use semantic understanding, not just keyword matching
- For "song about sky" - find music/video links with "sky" in title
- Return ONLY valid JSON, no markdown

Example:
{
  "indices": [0, 3, 7],
  "reasoning": "Links 0,3,7 are music videos matching the query theme"
}`;

    const response = await withRetry(async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You help make semantic search across saved links. Always return valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      return completion.choices[0].message.content;
    });

    console.log('🤖 AI Response:', response);

    const data = parseAIResponse(response);
    const indices = Array.isArray(data.indices) ? data.indices : [];
    
    console.log(`✅ Found ${indices.length} results:`, indices);
    if (data.reasoning) console.log(`💡 Reasoning: ${data.reasoning}`);
    
    const validIndices = indices.filter(i => 
      typeof i === 'number' && i >= 0 && i < links.length
    );

    return validIndices;
  }, 'smartSearchAI');
}

module.exports = { smartSearchAI };