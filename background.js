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
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generate-reply') {
    handleGenerateReply(request.data, sendResponse);
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

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Twitter Reply Bot extension installed');
});