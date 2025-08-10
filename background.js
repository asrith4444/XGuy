// Background service worker for 𝕏/𝕏 Reply Bot
// Updated for OpenAI Responses API with gpt-5-nano

self.importScripts = self.importScripts || (() => {});
try {
  self.importScripts('debug-logger.js');
} catch (e) {
  console.warn('Could not load debug-logger.js:', e);
}

if (typeof debugLogger === 'undefined') {
  self.debugLogger = {
    info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
    error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
    warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
    debug: (msg, data) => console.log(`[DEBUG] ${msg}`, data || '')
  };
}

chrome.commands.onCommand.addListener((command) => {
  if (command === 'trigger-reply') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && (tabs[0].url.includes('x.com') || tabs[0].url.includes('twitter.com'))) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'trigger-reply' });
      }
    });
  } else if (command === 'suggest-post') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && (tabs[0].url.includes('x.com') || tabs[0].url.includes('twitter.com'))) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'suggest-post' });
      }
    });
  }
});

// GPT-5 Chat function based on working GitHub repository code
async function openaiChat(messages, { 
  model = 'gpt-5-nano', 
  temperature = 0.2, 
  reasoning_effort = 'low', 
  verbosity = 'low',
  apiKey,
  timeoutMs = 30000
} = {}) {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  // Determine parameter support based on model
  const isGPT5 = typeof model === 'string' && /^gpt-5/.test(model);
  const isO1Series = typeof model === 'string' && /^o1/.test(model);
  const supportsAdjustableTemperature = !(isGPT5 || isO1Series);

  // Build payload conditionally to avoid unsupported params
  const payload = { model, messages };
  
  if (supportsAdjustableTemperature && typeof temperature === 'number') {
    payload.temperature = temperature;
  }
  if (isGPT5 && typeof reasoning_effort === 'string') {
    payload.reasoning_effort = reasoning_effort;
  }
  if (isGPT5 && typeof verbosity === 'string') {
    payload.verbosity = verbosity;
  }

  debugLogger.info('GPT-5 API Request', { model, payload });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Use Chat Completions for widest compatibility
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`OpenAI API ${resp.status}: ${text}`);
    }

    const data = await resp.json();
    debugLogger.info('GPT-5 API Response', { data });

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('Empty response from model');
    }

    debugLogger.info('Successfully extracted content', { content });
    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Wrapper function to maintain compatibility with existing code
async function callOpenAI({ 
  apiKey, 
  userPrompt, 
  model = 'gpt-5-nano', 
  reasoning_effort = 'high',
  maxOutputTokens = 200, 
  timeoutMs = 30000 
}) {
  if (typeof userPrompt !== 'string' || !userPrompt.trim()) {
    throw new Error("Prompt is empty. Build the prompt string before calling callOpenAI.");
  }

  // Convert single prompt to messages format
  const messages = [
    {
      role: 'user',
      content: userPrompt
    }
  ];

  return await openaiChat(messages, {
    model,
    temperature: 0.7,
    reasoning_effort,
    verbosity: 'medium',
    apiKey,
    timeoutMs
  });
}


// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generate-reply') {
    handleGenerateReply(request.data, sendResponse);
    return true;
  } else if (request.action === 'suggest-post') {
    handleSuggestPost(request.data, sendResponse);
    return true;
  }
});

async function handleGenerateReply(data, sendResponse) {
  try {
    debugLogger.info('handleGenerateReply called', { data });

    const { openai_api_key, personality, gpt_model, reasoning_effort } = await chrome.storage.sync.get([
      'openai_api_key', 
      'personality', 
      'gpt_model', 
      'reasoning_effort'
    ]);
    
    if (!openai_api_key) {
      sendResponse({ success: false, error: 'OpenAI API key not configured. Please set it in the extension options.' });
      return;
    }

    const tone = personality || 'friendly and helpful';
    const selectedModel = gpt_model || 'gpt-5-nano';
    const selectedEffort = reasoning_effort || 'high';
    const { postText, threadContext, userInsights } = data;
    
    debugLogger.info('Using model settings', { model: selectedModel, reasoning_effort: selectedEffort });

    let prompt;
    if (threadContext && threadContext.length > 1) {
      const threadSummary = threadContext.map((tweet, index) => `${index + 1}. ${tweet.text}`).join('\n');
      prompt = `You are a Twitter reply generator with a ${tone} personality.

THREAD CONTEXT (what you're replying to):
${threadSummary}

${userInsights ? `YOUR PERSPECTIVE/ANGLE (incorporate this into your reply):
"${userInsights}"

IMPORTANT: The above insights are YOUR viewpoint that you should express in your reply. You are NOT replying TO these insights - you are using them as YOUR perspective when replying to the thread.

` : ''}TASK: Write a reply to the thread above that:
• Matches your ${tone} personality
• Stays under 280 characters  
• Responds to the main thread topic
• Shows you understood the conversation
${userInsights ? `• Incorporates YOUR perspective/insights naturally into the reply
• Expresses the viewpoint provided in the insights section` : ''}
• Uses proper formatting with line breaks if needed for readability
• Uses hyphens (-) instead of em dashes (—)

Your reply:`;
    } else {
      prompt = `You are a Twitter reply generator with a ${tone} personality.

ORIGINAL POST (what you're replying to):
"${postText}"

${userInsights ? `YOUR PERSPECTIVE/ANGLE (incorporate this into your reply):
"${userInsights}"

IMPORTANT: The above insights are YOUR viewpoint that you should express in your reply. You are NOT replying TO these insights - you are using them as YOUR perspective when replying to the post.

` : ''}TASK: Write a reply to the post above that:
• Matches your ${tone} personality  
• Stays under 280 characters
• Adds meaningful value to the conversation
${userInsights ? `• Incorporates YOUR perspective/insights naturally into the reply
• Expresses the viewpoint provided in the insights section` : ''}
• Uses proper formatting with line breaks if needed for readability  
• Uses hyphens (-) instead of em dashes (—)

Your reply:`;
    }

    const generatedReply = await callOpenAI({
      apiKey: openai_api_key,
      userPrompt: prompt,
      model: selectedModel,
      reasoning_effort: selectedEffort,
      maxOutputTokens: 150,
      timeoutMs: 30000
    });

    if (!generatedReply) throw new Error('Empty response from model');

    sendResponse({ success: true, reply: generatedReply });
    debugLogger.info('Reply sent to content script', { success: true, reply: generatedReply });

  } catch (error) {
    debugLogger.error('Error generating reply', { error: error.message, stack: error.stack });
    sendResponse({ success: false, error: `OpenAI API Error: ${error.message}` });
  }
}

async function handleSuggestPost(data, sendResponse) {
  try {
    const { openai_api_key, personality, gpt_model, reasoning_effort } = await chrome.storage.sync.get([
      'openai_api_key', 
      'personality', 
      'gpt_model', 
      'reasoning_effort'
    ]);
    
    if (!openai_api_key) {
      sendResponse({ success: false, error: 'OpenAI API key not configured. Please set it in the extension options.' });
      return;
    }

    const tone = personality || 'friendly and helpful';
    const selectedModel = gpt_model || 'gpt-5-nano';
    const selectedEffort = reasoning_effort || 'high';
    const { storedPosts } = data;
    
    debugLogger.info('Post suggestion using model settings', { model: selectedModel, reasoning_effort: selectedEffort });

    const analysis = analyzeStoredPosts(storedPosts);

    const prompt = `You are a Twitter post generator with a ${tone} personality.

ANALYSIS:
${analysis.summary}

RECENT INTERACTIONS (${storedPosts.length}):
${storedPosts.slice(0, 10).map((post, i) => 
  `${i + 1}. Original: "${post.postText.substring(0, 100)}${post.postText.length > 100 ? '...' : ''}"
   Insights: "${post.userInsights || 'None'}"
   Reply: "${(post.generatedReply || '').substring(0, 80)}${(post.generatedReply || '').length > 80 ? '...' : ''}"`
).join('\n\n')}

Task: Propose one original tweet that
- matches the ${tone} personality
- is under 280 characters
- aligns with themes: ${analysis.themes.join(', ') || 'general'}
- is engaging and unique
Important rule: do not use em dashes. Use hyphens or other punctuation.

Tweet:`;

    const suggestedPost = await callOpenAI({
      apiKey: openai_api_key,
      userPrompt: prompt,
      model: selectedModel,
      reasoning_effort: selectedEffort,
      maxOutputTokens: 200,
      timeoutMs: 45000
    });

    if (!suggestedPost) throw new Error('Empty response from model');

    sendResponse({ success: true, suggestedPost });
    debugLogger.info('Post suggestion sent to content script', { success: true, suggestedPost });

  } catch (error) {
    debugLogger.error('Error generating suggested post', { error: error.message, stack: error.stack });
    sendResponse({ success: false, error: `OpenAI API Error: ${error.message}` });
  }
}

function analyzeStoredPosts(storedPosts) {
  const themes = new Set();
  const keywords = new Set();
  let totalWords = 0;
  let questionPosts = 0;
  let technicalPosts = 0;

  storedPosts.forEach(post => {
    const text = (post.postText || '').toLowerCase();
    const words = text.split(/\s+/).filter(Boolean);
    totalWords += words.length;

    if (/(^|\s)(tech|code|dev|programming)(\s|$)/.test(text)) {
      themes.add('technology'); technicalPosts++;
    }
    if (/(business|startup|entrepreneur)/.test(text)) themes.add('business');
    if (/(learn|education|study)/.test(text)) themes.add('learning');
    if (/(^|\s)(ai|machine learning|artificial intelligence)(\s|$)/.test(text)) themes.add('artificial intelligence');
    if (/(design|creative|art)/.test(text)) themes.add('design');
    if (/(productivity|workflow|efficiency)/.test(text)) themes.add('productivity');

    if (/[?]/.test(text) || /\b(how|why|what)\b/.test(text)) questionPosts++;

    if (post.userInsights) {
      post.userInsights.toLowerCase().split(/\s+/)
        .filter(w => w.length > 4).slice(0, 3)
        .forEach(w => keywords.add(w));
    }
  });

  const count = Math.max(storedPosts.length, 1);
  const avgWordsPerPost = Math.round(totalWords / count);
  const questionRatio = Math.round((questionPosts / count) * 100);
  const technicalRatio = Math.round((technicalPosts / count) * 100);

  return {
    themes: Array.from(themes),
    keywords: Array.from(keywords),
    summary: `User typically engages with posts averaging ${avgWordsPerPost} words. ${questionRatio}% involve questions. ${technicalRatio}% involve technical content. Main interests: ${Array.from(themes).join(', ') || 'general topics'}.`,
    patterns: { avgWordsPerPost, questionRatio, technicalRatio }
  };
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('𝕏 Reply Bot extension installed');
});

