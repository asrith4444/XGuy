// Background service worker for Twitter Reply Bot
// Handles GPT-4.1-nano API calls and keyboard shortcut commands

chrome.commands.onCommand.addListener((command) => {
  if (command === 'trigger-reply') {
    // Send message to active tab's content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && (tabs[0].url.includes('x.com') || tabs[0].url.includes('twitter.com'))) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'trigger-reply' });
      }
    });
  } else if (command === 'suggest-post') {
    // Send message to active tab's content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && (tabs[0].url.includes('x.com') || tabs[0].url.includes('twitter.com'))) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'suggest-post' });
      }
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generate-reply') {
    handleGenerateReply(request.data, sendResponse);
    return true; // Keep message channel open for async response
  } else if (request.action === 'suggest-post') {
    handleSuggestPost(request.data, sendResponse);
    return true; // Keep message channel open for async response
  }
});

async function handleGenerateReply(data, sendResponse) {
  try {
    // Get API key and personality from storage
    const result = await chrome.storage.sync.get(['openai_api_key', 'personality']);
    
    if (!result.openai_api_key) {
      sendResponse({ 
        success: false, 
        error: 'OpenAI API key not configured. Please set it in the extension options.' 
      });
      return;
    }

    const personality = result.personality || 'friendly and helpful';
    const { postText, threadContext, userInsights } = data;

    // Construct the prompt for GPT-4.1-nano
    let prompt;
    
    if (threadContext && threadContext.length > 1) {
      // This is a thread - provide full context
      const threadSummary = threadContext.map((tweet, index) => 
        `${index + 1}. ${tweet.text}`
      ).join('\n');
      
      prompt = `You are a Twitter reply generator with a ${personality} personality. 

THREAD CONTEXT (multiple connected tweets):
${threadSummary}

${userInsights ? `User Insights about this thread: "${userInsights}"` : ''}

Generate a thoughtful, engaging reply that:
1. Reflects the ${personality} personality
2. Is appropriate for Twitter (under 280 characters)
3. Responds to the ENTIRE thread context, not just one tweet
4. Shows understanding of the complete conversation/argument
${userInsights ? '5. Takes into account the provided user insights' : ''}
6. IMPORTANT: Do not use em dashes (—) in your response. Use regular hyphens (-) or other punctuation instead.

Reply:`;
    } else {
      // Single tweet
      prompt = `You are a Twitter reply generator with a ${personality} personality. 

Original Post: "${postText}"

${userInsights ? `User Insights about this post: "${userInsights}"` : ''}

Generate a thoughtful, engaging reply that:
1. Reflects the ${personality} personality
2. Is appropriate for Twitter (under 280 characters)
3. Adds value to the conversation
${userInsights ? '4. Takes into account the provided user insights' : ''}
5. IMPORTANT: Do not use em dashes (—) in your response. Use regular hyphens (-) or other punctuation instead.

Reply:`;
    }

    // Make API call to GPT-4.1-nano with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${result.openai_api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano-2025-04-14',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
    }

    const responseData = await response.json();
    const generatedReply = responseData.choices[0].message.content.trim();

    sendResponse({
      success: true,
      reply: generatedReply
    });

  } catch (error) {
    console.error('Error generating reply:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

async function handleSuggestPost(data, sendResponse) {
  try {
    // Get API key and personality from storage
    const result = await chrome.storage.sync.get(['openai_api_key', 'personality']);
    
    if (!result.openai_api_key) {
      sendResponse({ 
        success: false, 
        error: 'OpenAI API key not configured. Please set it in the extension options.' 
      });
      return;
    }

    const personality = result.personality || 'friendly and helpful';
    const { storedPosts } = data;

    // Analyze the stored posts to extract themes and patterns
    const postAnalysis = analyzeStoredPosts(storedPosts);
    
    // Construct the prompt for GPT-4.1-nano
    const prompt = `You are a Twitter post generator with a ${personality} personality. 

ANALYSIS OF USER'S RECENT ENGAGEMENT:
${postAnalysis.summary}

RECENT POST INTERACTIONS (${storedPosts.length} posts):
${storedPosts.slice(0, 10).map((post, index) => 
  `${index + 1}. Original: "${post.postText.substring(0, 100)}${post.postText.length > 100 ? '...' : ''}"
     User's insights: "${post.userInsights || 'None'}"
     Generated reply: "${post.generatedReply.substring(0, 80)}${post.generatedReply.length > 80 ? '...' : ''}"`
).join('\n\n')}

TASK: Based on this analysis of the user's interests, engagement patterns, and reply style, suggest an original Twitter post that:

1. Reflects the ${personality} personality
2. Is appropriate for Twitter (under 280 characters)
3. Aligns with the user's demonstrated interests and themes: ${postAnalysis.themes.join(', ')}
4. Is engaging and likely to generate meaningful discussions
5. Is completely original and not a copy of any previous posts
6. Uses the user's typical style and approach to topics
7. IMPORTANT: Do not use em dashes (—) in your response. Use regular hyphens (-) or other punctuation instead.

Generate ONE high-quality, engaging Twitter post:`;

    // Make API call to GPT-4.1-nano with longer timeout for analysis
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout for complex analysis
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${result.openai_api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano-2025-04-14',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 120,
        temperature: 0.8
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
    }

    const responseData = await response.json();
    const suggestedPost = responseData.choices[0].message.content.trim();

    sendResponse({
      success: true,
      suggestedPost: suggestedPost
    });

  } catch (error) {
    console.error('Error generating suggested post:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

function analyzeStoredPosts(storedPosts) {
  // Extract themes and patterns from stored posts
  const themes = new Set();
  const keywords = new Set();
  let totalWords = 0;
  let questionPosts = 0;
  let technicalPosts = 0;
  
  storedPosts.forEach(post => {
    const text = post.postText.toLowerCase();
    const words = text.split(/\s+/);
    totalWords += words.length;
    
    // Look for themes
    if (text.includes('tech') || text.includes('code') || text.includes('dev') || text.includes('programming')) {
      themes.add('technology');
      technicalPosts++;
    }
    if (text.includes('business') || text.includes('startup') || text.includes('entrepreneur')) {
      themes.add('business');
    }
    if (text.includes('learn') || text.includes('education') || text.includes('study')) {
      themes.add('learning');
    }
    if (text.includes('ai') || text.includes('machine learning') || text.includes('artificial intelligence')) {
      themes.add('artificial intelligence');
    }
    if (text.includes('design') || text.includes('creative') || text.includes('art')) {
      themes.add('design');
    }
    if (text.includes('productivity') || text.includes('workflow') || text.includes('efficiency')) {
      themes.add('productivity');
    }
    
    // Check for questions
    if (text.includes('?') || text.includes('how') || text.includes('why') || text.includes('what')) {
      questionPosts++;
    }
    
    // Extract keywords from user insights
    if (post.userInsights) {
      const insightWords = post.userInsights.toLowerCase().split(/\s+/)
        .filter(word => word.length > 4)
        .slice(0, 3);
      insightWords.forEach(word => keywords.add(word));
    }
  });

  const avgWordsPerPost = Math.round(totalWords / storedPosts.length);
  const questionRatio = Math.round((questionPosts / storedPosts.length) * 100);
  const technicalRatio = Math.round((technicalPosts / storedPosts.length) * 100);

  return {
    themes: Array.from(themes),
    keywords: Array.from(keywords),
    summary: `User typically engages with posts averaging ${avgWordsPerPost} words. ${questionRatio}% of interactions involve questions or discussion prompts. ${technicalRatio}% involve technical content. Main interests: ${Array.from(themes).join(', ') || 'general topics'}.`,
    patterns: {
      avgWordsPerPost,
      questionRatio,
      technicalRatio
    }
  };
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Twitter Reply Bot extension installed');
});