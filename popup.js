// Popup script for 𝕏 Reply Bot

document.addEventListener('DOMContentLoaded', async () => {
  // Display keyboard shortcut (Ctrl only to avoid conflicts)
  const shortcutDisplay = document.getElementById('shortcut-display');
  shortcutDisplay.textContent = 'Ctrl+Shift+R';

  // Load and display status
  await updateStatus();

  // Check current site
  await checkCurrentSite();

  // Add event listeners
  document.getElementById('test-btn').addEventListener('click', testExtension);
});

async function updateStatus() {
  try {
    const result = await chrome.storage.sync.get(['openai_api_key', 'personality']);
    
    // API Key status
    const apiStatus = document.getElementById('api-status');
    if (result.openai_api_key && result.openai_api_key.startsWith('sk-')) {
      apiStatus.className = 'status-indicator status-good';
    } else {
      apiStatus.className = 'status-indicator status-bad';
    }

    // Personality status
    const personalityStatus = document.getElementById('personality-status');
    if (result.personality && result.personality.trim().length > 0) {
      personalityStatus.className = 'status-indicator status-good';
    } else {
      personalityStatus.className = 'status-indicator status-bad';
    }

  } catch (error) {
    console.error('Error loading status:', error);
    document.getElementById('api-status').className = 'status-indicator status-bad';
    document.getElementById('personality-status').className = 'status-indicator status-bad';
  }
}

async function checkCurrentSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const siteStatus = document.getElementById('site-status');
    const currentSite = document.getElementById('current-site');
    
    if (tab && (tab.url.includes('x.com') || tab.url.includes('twitter.com'))) {
      siteStatus.className = 'status-indicator status-good';
      currentSite.textContent = 'Ready on ' + (tab.url.includes('x.com') ? '𝕏.com' : 'Twitter.com');
    } else {
      siteStatus.className = 'status-indicator status-bad';
      currentSite.textContent = tab ? 'Not on Twitter/𝕏.com' : 'No active tab';
    }
  } catch (error) {
    console.error('Error checking current site:', error);
    document.getElementById('site-status').className = 'status-indicator status-bad';
    document.getElementById('current-site').textContent = 'Unable to check site';
  }
}

async function testExtension() {
  const testBtn = document.getElementById('test-btn');
  const originalText = testBtn.textContent;
  
  testBtn.textContent = '⏳ Testing...';
  testBtn.disabled = true;

  try {
    // Check if we're on the right site
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || (!tab.url.includes('x.com') && !tab.url.includes('twitter.com'))) {
      throw new Error('Please navigate to 𝕏.com or Twitter.com first');
    }

    // Check configuration
    const result = await chrome.storage.sync.get(['openai_api_key', 'personality']);
    
    if (!result.openai_api_key) {
      throw new Error('API key not configured. Please visit Settings.');
    }

    if (!result.personality) {
      throw new Error('Personality not configured. Please visit Settings.');
    }

    // Send test message to content script
    const response = await chrome.tabs.sendMessage(tab.id, { 
      action: 'test-extension' 
    });

    if (response && response.success) {
      testBtn.textContent = '✅ Ready!';
      testBtn.style.background = 'rgba(23, 191, 99, 0.2)';
      testBtn.style.borderColor = 'rgba(23, 191, 99, 0.3)';
      
      setTimeout(() => {
        testBtn.textContent = originalText;
        testBtn.style.background = '';
        testBtn.style.borderColor = '';
      }, 2000);
    } else {
      throw new Error('Content script not responding. Try refreshing the page.');
    }

  } catch (error) {
    console.error('Test failed:', error);
    testBtn.textContent = '❌ Error';
    testBtn.style.background = 'rgba(224, 36, 94, 0.2)';
    testBtn.style.borderColor = 'rgba(224, 36, 94, 0.3)';
    
    // Show error in a subtle way
    const currentSite = document.getElementById('current-site');
    currentSite.textContent = error.message;
    currentSite.style.color = '#ffcdd2';
    
    setTimeout(() => {
      testBtn.textContent = originalText;
      testBtn.style.background = '';
      testBtn.style.borderColor = '';
      checkCurrentSite(); // Reset current site display
    }, 3000);
  } finally {
    testBtn.disabled = false;
  }
}