
function safeJSONParse(text) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
  
 
  async function withRetry(fn, { retries = 3, delay = 1000 } = {}) {
    let attempt = 0;
    while (attempt < retries) {
      try {
        return await fn();
      } catch (err) {
        attempt++;
        if (attempt >= retries) throw err;
        const wait = delay * Math.pow(2, attempt - 1);
        console.warn(`⚠️ Ошибка (попытка ${attempt}/${retries}): ${err.message}. Повтор через ${wait} мс`);
        await new Promise(res => setTimeout(res, wait));
      }
    }
  }
  

  async function measureExecution(fn, label = 'AI') {
    const start = Date.now();
    const result = await fn();
    const end = Date.now();
    console.log(`⏱ ${label}: ${(end - start) / 1000}s`);
    return result;
  }
  
 
  function parseAIResponse(text) {
    const parsed = safeJSONParse(text);
    if (parsed && typeof parsed === 'object') return parsed;
  
    return { summary: text };
  }
  
  module.exports = {
    safeJSONParse,
    withRetry,
    measureExecution,
    parseAIResponse,
  };
  