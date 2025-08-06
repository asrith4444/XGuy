// Content script for Twitter Reply Bot
// Handles DOM interaction on X.com/Twitter and modal display

let currentTweetElement = null;
let insightsModal = null;
let suggestModal = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'trigger-reply') {
    handleTriggerReply();
  } else if (request.action === 'suggest-post') {
    handleSuggestPost();
  } else if (request.action === 'test-extension') {
    sendResponse({ success: true, message: 'Extension is working!' });
  }
});

// Also listen for keyboard shortcuts directly (backup)
// Only use Ctrl key to avoid conflicts with browser shortcuts
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.shiftKey && event.key.toUpperCase() === 'R') {
    event.preventDefault();
    handleTriggerReply();
  } else if (event.ctrlKey && event.shiftKey && event.key.toUpperCase() === 'S') {
    event.preventDefault();
    handleSuggestPost();
  }
});

function handleTriggerReply() {
  // Find the tweet the user is currently focused on or hovering over
  const tweetElement = findCurrentTweet();
  
  if (!tweetElement) {
    showNotification('Please hover over or click on a tweet first', 'error');
    return;
  }

  const tweetText = extractTweetText(tweetElement);
  
  if (!tweetText) {
    showNotification('Could not extract tweet text', 'error');
    return;
  }

  // Check if this is part of a thread and extract thread context
  const threadContext = extractThreadContext(tweetElement);
  
  currentTweetElement = tweetElement;
  showInsightsModal(tweetText, threadContext);
}

function findCurrentTweet() {
  // Try to find a tweet that's currently focused or under cursor
  const focusedElement = document.activeElement;
  
  // Look for tweet container by traversing up from focused element
  let tweetElement = focusedElement;
  while (tweetElement && !isTweetElement(tweetElement)) {
    tweetElement = tweetElement.parentElement;
  }
  
  if (tweetElement) return tweetElement;
  
  // Fallback: look for tweet under cursor or recently hovered
  const tweets = document.querySelectorAll('[data-testid="tweet"]');
  
  // Return the first visible tweet if no specific one is focused
  for (const tweet of tweets) {
    const rect = tweet.getBoundingClientRect();
    if (rect.top >= 0 && rect.top <= window.innerHeight / 2) {
      return tweet;
    }
  }
  
  return tweets[0] || null;
}

function isTweetElement(element) {
  return element && (
    element.getAttribute('data-testid') === 'tweet' ||
    element.querySelector('[data-testid="tweet"]') ||
    element.closest('[data-testid="tweet"]')
  );
}

function extractTweetText(tweetElement) {
  // Multiple selectors to handle different Twitter layouts
  const textSelectors = [
    '[data-testid="tweetText"]',
    '[data-testid="tweetText"] span',
    'div[lang] span',
    '[dir="auto"] span',
    'span[dir="auto"]',
    '.r-37j5jr span', // Twitter's text spans
    'span'
  ];
  
  for (const selector of textSelectors) {
    const textElements = tweetElement.querySelectorAll(selector);
    for (const element of textElements) {
      const text = element.textContent?.trim();
      if (text && text.length > 10 && !text.includes('Show this thread') && !text.includes('Replying to')) {
        return text;
      }
    }
  }
  
  // More aggressive fallback
  const allText = tweetElement.textContent || '';
  const lines = allText.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 10 && 
           !trimmed.includes('·') && 
           !trimmed.includes('Show this thread') &&
           !trimmed.includes('Replying to') &&
           !trimmed.match(/^\d+[mhd]$/) && // Time indicators
           !trimmed.match(/^[\d,]+$/) && // Numbers only
           !trimmed.includes('Repost') &&
           !trimmed.includes('Quote');
  });
  
  return lines[0] || 'Tweet text could not be extracted';
}

function extractThreadContext(tweetElement) {
  const tweetText = tweetElement.textContent || '';
  
  // Look for explicit thread indicators in the current tweet
  const threadIndicators = [
    'Show this thread',
    /\d+\/\d+/,  // Pattern like "1/5", "2/8", etc.
    /^\d+\./,    // Pattern like "1.", "2.", etc. at start
    '🧵'
  ];
  
  // Check if current tweet has explicit thread indicators
  const hasThreadIndicator = threadIndicators.some(indicator => {
    if (indicator instanceof RegExp) {
      return indicator.test(tweetText);
    }
    return tweetText.includes(indicator);
  });
  
  if (!hasThreadIndicator) {
    // Check if this tweet is part of a conversation thread (replies to same original post)
    const conversationThread = findConversationThread(tweetElement);
    if (conversationThread && conversationThread.length > 1) {
      return conversationThread;
    }
    return null; // Not a thread, just a single tweet
  }
  
  // This appears to be an explicit thread, collect connected thread tweets
  return findExplicitThread(tweetElement);
}

function findConversationThread(tweetElement) {
  // Look for "Replying to @username" indicators to identify conversation threads
  const replyingToElements = document.querySelectorAll('[dir="ltr"]');
  const conversationTweets = [];
  
  // Check if current page shows a conversation thread
  const hasReplyingTo = Array.from(replyingToElements).some(el => 
    el.textContent.includes('Replying to @')
  );
  
  if (!hasReplyingTo) {
    return null;
  }
  
  // Get tweets that are part of this conversation
  const allTweets = document.querySelectorAll('[data-testid="tweet"]');
  const seenTexts = new Set();
  
  for (const tweet of allTweets) {
    const text = extractTweetText(tweet);
    if (text && text !== 'Tweet text could not be extracted' && !seenTexts.has(text)) {
      // Check if this tweet is part of the conversation (not a random reply)
      const tweetContainer = tweet.textContent || '';
      if (!tweetContainer.includes('Promoted') && !tweetContainer.includes('Ad')) {
        conversationTweets.push({
          text: text,
          author: extractTweetAuthor(tweet),
          element: tweet
        });
        seenTexts.add(text);
      }
    }
  }
  
  // Only return if we have 2-5 tweets (reasonable conversation thread)
  return conversationTweets.length >= 2 && conversationTweets.length <= 5 ? conversationTweets : null;
}

function findExplicitThread(tweetElement) {
  const threadTweets = [];
  const currentAuthor = extractTweetAuthor(tweetElement);
  const allTweets = document.querySelectorAll('[data-testid="tweet"]');
  const seenTexts = new Set();
  
  for (const tweet of allTweets) {
    const author = extractTweetAuthor(tweet);
    if (author === currentAuthor) {
      const text = extractTweetText(tweet);
      const tweetContent = tweet.textContent || '';
      
      if (text && text !== 'Tweet text could not be extracted' && !seenTexts.has(text)) {
        // Only include if it has thread indicators or is sequential
        const hasThreadMarkers = 
          /\d+\/\d+/.test(tweetContent) ||  // "1/5", "2/5" pattern
          /^\d+\./.test(text) ||           // "1.", "2." at start
          tweetContent.includes('🧵') ||
          tweetContent.includes('Show this thread');
          
        if (hasThreadMarkers) {
          threadTweets.push({
            text: text,
            author: author,
            element: tweet
          });
          seenTexts.add(text);
        }
      }
    }
  }
  
  return threadTweets.length > 1 ? threadTweets : null;
}


function extractTweetAuthor(tweetElement) {
  // Look for author name/handle
  const authorSelectors = [
    '[data-testid="User-Name"] span',
    '[data-testid="User-Names"] span',
    'a[role="link"] span',
    '.r-18u37iz span' // Twitter's username spans
  ];
  
  for (const selector of authorSelectors) {
    const authorElement = tweetElement.querySelector(selector);
    if (authorElement && authorElement.textContent && !authorElement.textContent.includes('@')) {
      return authorElement.textContent.trim();
    }
  }
  
  return 'Unknown';
}

function showInsightsModal(tweetText, threadContext) {
  // Remove existing modal if any
  if (insightsModal) {
    insightsModal.remove();
  }

  // Create modal
  insightsModal = document.createElement('div');
  insightsModal.className = 'replybot-modal';
  insightsModal.innerHTML = `
    <div class="replybot-modal-content">
      <div class="replybot-modal-header">
        <h3>Generate Reply</h3>
        <button class="replybot-close-btn">&times;</button>
      </div>
      
      <div class="replybot-modal-body">
        <div class="replybot-tweet-preview">
          ${threadContext ? '<strong>Thread detected! Context:</strong>' : '<strong>Tweet:</strong>'}
          ${threadContext ? 
            threadContext.map((tweet, index) => 
              `<p class="replybot-tweet-text"><small>${index + 1}.</small> ${escapeHtml(tweet.text)}</p>`
            ).join('') 
            : 
            `<p class="replybot-tweet-text">${escapeHtml(tweetText)}</p>`
          }
        </div>
        
        <div class="replybot-insights-section">
          <label for="replybot-insights">Any insights about this post to consider in the reply?</label>
          <textarea 
            id="replybot-insights" 
            placeholder="Optional: Add your thoughts, context, or specific angle for the reply..."
            rows="3"
          ></textarea>
        </div>
        
        <div class="replybot-actions">
          <button id="replybot-cancel" class="replybot-btn replybot-btn-secondary">Cancel</button>
          <button id="replybot-generate" class="replybot-btn replybot-btn-primary">Generate Reply</button>
        </div>
        
        <div id="replybot-loading" class="replybot-loading" style="display: none;">
          <div class="replybot-spinner"></div>
          <span>Generating reply...</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(insightsModal);

  // Add event listeners
  const closeBtn = insightsModal.querySelector('.replybot-close-btn');
  const cancelBtn = insightsModal.querySelector('#replybot-cancel');
  const generateBtn = insightsModal.querySelector('#replybot-generate');
  const insightsInput = insightsModal.querySelector('#replybot-insights');

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  generateBtn.addEventListener('click', () => generateReply(tweetText, threadContext));
  
  // Close on backdrop click
  insightsModal.addEventListener('click', (e) => {
    if (e.target === insightsModal) {
      closeModal();
    }
  });

  // Focus on insights input
  setTimeout(() => insightsInput.focus(), 100);

  // Handle Enter key in textarea (Ctrl/Cmd + Enter to generate)
  insightsInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      generateReply(tweetText, threadContext);
    } else if (e.key === 'Escape') {
      closeModal();
    }
  });
}

function generateReply(tweetText, threadContext) {
  const insightsInput = document.querySelector('#replybot-insights');
  const loadingDiv = document.querySelector('#replybot-loading');
  const generateBtn = document.querySelector('#replybot-generate');
  
  const userInsights = insightsInput.value.trim();
  
  // Show loading state
  loadingDiv.style.display = 'flex';
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating...';

  // Send request to background script
  chrome.runtime.sendMessage({
    action: 'generate-reply',
    data: {
      postText: tweetText,
      threadContext: threadContext,
      userInsights: userInsights
    }
  }, (response) => {
    // Hide loading state
    loadingDiv.style.display = 'none';
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate Reply';

    if (response.success) {
      insertReplyIntoTwitter(response.reply);
      closeModal();
      // Store the post interaction for future analysis
      storePostInteraction(tweetText, threadContext, userInsights, response.reply);
      // Don't show additional success message here - insertReplyIntoTwitter handles it
    } else {
      showNotification(`Error: ${response.error}`, 'error');
    }
  });
}

function insertReplyIntoTwitter(replyText) {
  // First, try to click the reply button on the current tweet
  const replyButton = currentTweetElement.querySelector('[data-testid="reply"]');
  if (replyButton) {
    replyButton.click();
    
    // Wait for reply composer to open, then insert text
    setTimeout(() => {
      insertTextIntoReplyComposer(replyText);
    }, 500);
  } else {
    // Fallback: look for any open reply composer
    setTimeout(() => {
      insertTextIntoReplyComposer(replyText);
    }, 100);
  }
}

function insertTextIntoReplyComposer(replyText) {
  // Always copy to clipboard - most reliable approach
  navigator.clipboard.writeText(replyText).then(() => {
    showNotification('✅ Reply copied to clipboard! Paste it with Ctrl+V (or Cmd+V)', 'success', 6000);
    
    // Also try to open reply box for user convenience
    const replyButton = currentTweetElement.querySelector('[data-testid="reply"]');
    if (replyButton) {
      setTimeout(() => {
        replyButton.click();
        showNotification('💡 Reply box opened - just paste with Ctrl+V!', 'info', 4000);
      }, 500);
    }
  }).catch(() => {
    showNotification('❌ Could not copy to clipboard', 'error');
  });
}


function closeModal() {
  if (insightsModal) {
    insightsModal.remove();
    insightsModal = null;
  }
}

function showNotification(message, type = 'info', duration = 4000) {
  const notification = document.createElement('div');
  notification.className = `replybot-notification replybot-notification-${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => notification.classList.add('replybot-notification-show'), 10);
  
  // Remove after specified duration
  setTimeout(() => {
    notification.classList.remove('replybot-notification-show');
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Post storage functionality
async function storePostInteraction(postText, threadContext, userInsights, generatedReply) {
  try {
    // Get existing stored posts
    const result = await chrome.storage.local.get(['stored_posts']);
    const storedPosts = result.stored_posts || [];
    
    // Create new post entry
    const newPost = {
      id: Date.now(),
      postText,
      threadContext,
      userInsights,
      generatedReply,
      timestamp: Date.now(),
      url: window.location.href
    };
    
    // Add to beginning of array (most recent first)
    storedPosts.unshift(newPost);
    
    // Keep only last 50 posts and remove posts older than 24 hours
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const filteredPosts = storedPosts
      .filter(post => post.timestamp > oneDayAgo)
      .slice(0, 50);
    
    // Save back to storage
    await chrome.storage.local.set({ stored_posts: filteredPosts });
    
  } catch (error) {
    console.error('Error storing post interaction:', error);
  }
}

async function handleSuggestPost() {
  try {
    // Get stored posts
    const result = await chrome.storage.local.get(['stored_posts']);
    const storedPosts = result.stored_posts || [];
    
    // Clean up old posts (24+ hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentPosts = storedPosts.filter(post => post.timestamp > oneDayAgo);
    
    if (recentPosts.length === 0) {
      showNotification('No recent post interactions found. Generate some replies first!', 'info', 5000);
      return;
    }
    
    // Update storage with cleaned posts
    if (recentPosts.length !== storedPosts.length) {
      await chrome.storage.local.set({ stored_posts: recentPosts });
    }
    
    showSuggestPostModal(recentPosts);
    
  } catch (error) {
    console.error('Error handling suggest post:', error);
    showNotification('Error loading stored posts', 'error');
  }
}

function showSuggestPostModal(storedPosts) {
  // Remove existing modal if any
  if (suggestModal) {
    suggestModal.remove();
  }

  // Create modal
  suggestModal = document.createElement('div');
  suggestModal.className = 'replybot-modal replybot-suggest-modal';
  suggestModal.innerHTML = `
    <div class="replybot-modal-content">
      <div class="replybot-modal-header">
        <h3>Suggest New Post</h3>
        <button class="replybot-close-btn">&times;</button>
      </div>
      
      <div class="replybot-suggest-content">
        <div class="replybot-suggest-intro">
          Based on your recent ${storedPosts.length} post interaction${storedPosts.length === 1 ? '' : 's'}, 
          I'll analyze your engagement patterns and suggest a new post that aligns with your interests and style.
        </div>
        
        <div class="replybot-stored-posts">
          <h4>Recent Interactions (${storedPosts.length})</h4>
          <div class="replybot-posts-list">
            ${storedPosts.slice(0, 10).map(post => `
              <div class="replybot-post-item">
                <div>${escapeHtml(post.postText.substring(0, 120))}${post.postText.length > 120 ? '...' : ''}</div>
                <div class="replybot-post-timestamp">${formatTimestamp(post.timestamp)}</div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="replybot-generated-post">
          <label for="replybot-suggested-text">Suggested Post:</label>
          <textarea 
            id="replybot-suggested-text" 
            class="replybot-generated-text"
            placeholder="Click 'Generate Suggestion' to create a post based on your interactions..."
            readonly
          ></textarea>
        </div>
        
        <div class="replybot-post-actions">
          <button id="replybot-copy-post" class="replybot-copy-btn" disabled>Copy to Clipboard</button>
          <div class="replybot-actions">
            <button id="replybot-suggest-cancel" class="replybot-btn replybot-btn-secondary">Close</button>
            <button id="replybot-suggest-generate" class="replybot-btn replybot-btn-primary">Generate Suggestion</button>
          </div>
        </div>
        
        <div id="replybot-suggest-loading" class="replybot-loading" style="display: none;">
          <div class="replybot-spinner"></div>
          <span>Analyzing your interests and generating suggestion...</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(suggestModal);

  // Add event listeners
  const closeBtn = suggestModal.querySelector('.replybot-close-btn');
  const cancelBtn = suggestModal.querySelector('#replybot-suggest-cancel');
  const generateBtn = suggestModal.querySelector('#replybot-suggest-generate');
  const copyBtn = suggestModal.querySelector('#replybot-copy-post');
  const textArea = suggestModal.querySelector('#replybot-suggested-text');

  closeBtn.addEventListener('click', closeSuggestModal);
  cancelBtn.addEventListener('click', closeSuggestModal);
  generateBtn.addEventListener('click', () => generateSuggestedPost(storedPosts));
  copyBtn.addEventListener('click', () => {
    const text = textArea.value;
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        showNotification('✅ Post copied to clipboard!', 'success');
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy to Clipboard';
        }, 2000);
      }).catch(() => {
        showNotification('❌ Could not copy to clipboard', 'error');
      });
    }
  });
  
  // Close on backdrop click
  suggestModal.addEventListener('click', (e) => {
    if (e.target === suggestModal) {
      closeSuggestModal();
    }
  });
}

function generateSuggestedPost(storedPosts) {
  const loadingDiv = document.querySelector('#replybot-suggest-loading');
  const generateBtn = document.querySelector('#replybot-suggest-generate');
  const copyBtn = document.querySelector('#replybot-copy-post');
  const textArea = document.querySelector('#replybot-suggested-text');
  
  // Show loading state
  loadingDiv.style.display = 'flex';
  generateBtn.disabled = true;
  generateBtn.textContent = 'Analyzing...';
  copyBtn.disabled = true;
  textArea.value = '';

  // Send request to background script
  chrome.runtime.sendMessage({
    action: 'suggest-post',
    data: {
      storedPosts: storedPosts
    }
  }, (response) => {
    // Hide loading state
    loadingDiv.style.display = 'none';
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate Another';

    if (response.success) {
      textArea.value = response.suggestedPost;
      textArea.readOnly = false;
      copyBtn.disabled = false;
      showNotification('✨ Post suggestion generated!', 'success');
    } else {
      textArea.value = `Error generating suggestion: ${response.error}`;
      showNotification(`Error: ${response.error}`, 'error');
    }
  });
}

function closeSuggestModal() {
  if (suggestModal) {
    suggestModal.remove();
    suggestModal = null;
  }
}

function formatTimestamp(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else {
    return new Date(timestamp).toLocaleDateString();
  }
}

// Initialize
console.log('Twitter Reply Bot content script loaded');