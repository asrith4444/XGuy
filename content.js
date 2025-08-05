// Content script for Twitter Reply Bot
// Handles DOM interaction on X.com/Twitter and modal display

let currentTweetElement = null;
let insightsModal = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'trigger-reply') {
    handleTriggerReply();
  } else if (request.action === 'test-extension') {
    sendResponse({ success: true, message: 'Extension is working!' });
  }
});

// Also listen for keyboard shortcut directly (backup)
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
    event.preventDefault();
    handleTriggerReply();
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
  const threadTweets = [];
  
  // Look for thread indicators
  const threadIndicators = [
    'Show this thread',
    'thread',
    'Thread',
    '🧵'
  ];
  
  // Check if current tweet has thread indicators
  const tweetText = tweetElement.textContent || '';
  const hasThreadIndicator = threadIndicators.some(indicator => 
    tweetText.includes(indicator)
  );
  
  if (!hasThreadIndicator) {
    // Check for connected tweets (replies in same thread)
    const connectedTweets = findConnectedTweets(tweetElement);
    if (connectedTweets.length <= 1) {
      return null; // Not a thread, just a single tweet
    }
    return connectedTweets;
  }
  
  // This appears to be a thread, collect all tweets
  const allTweets = document.querySelectorAll('[data-testid="tweet"]');
  const currentAuthor = extractTweetAuthor(tweetElement);
  
  for (const tweet of allTweets) {
    const author = extractTweetAuthor(tweet);
    if (author === currentAuthor) {
      const text = extractTweetText(tweet);
      if (text && text !== 'Tweet text could not be extracted') {
        threadTweets.push({
          text: text,
          author: author,
          element: tweet
        });
      }
    }
  }
  
  return threadTweets.length > 1 ? threadTweets : null;
}

function findConnectedTweets(tweetElement) {
  const connectedTweets = [];
  const currentAuthor = extractTweetAuthor(tweetElement);
  
  // Look for tweets from same author in current view
  const allTweets = document.querySelectorAll('[data-testid="tweet"]');
  
  for (const tweet of allTweets) {
    const author = extractTweetAuthor(tweet);
    if (author === currentAuthor) {
      const text = extractTweetText(tweet);
      if (text && text !== 'Tweet text could not be extracted') {
        connectedTweets.push({
          text: text,
          author: author,
          element: tweet
        });
      }
    }
  }
  
  return connectedTweets;
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

// Initialize
console.log('Twitter Reply Bot content script loaded');