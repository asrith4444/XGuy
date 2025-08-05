// Options page script for Twitter Reply Bot

document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('api-key');
  const personalityInput = document.getElementById('personality');
  const saveBtn = document.getElementById('save-btn');
  const statusMessage = document.getElementById('status-message');

  // Load saved settings
  try {
    const result = await chrome.storage.sync.get(['openai_api_key', 'personality']);
    
    if (result.openai_api_key) {
      apiKeyInput.value = result.openai_api_key;
    }
    
    if (result.personality) {
      personalityInput.value = result.personality;
    } else {
      personalityInput.value = 'friendly and helpful';
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }

  // Save settings
  saveBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const personality = personalityInput.value.trim();

    // Validate inputs
    if (!apiKey) {
      showStatus('Please enter your OpenAI API key', 'error');
      apiKeyInput.focus();
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      showStatus('Invalid API key format. API keys should start with "sk-"', 'error');
      apiKeyInput.focus();
      return;
    }

    if (!personality) {
      showStatus('Please describe your desired reply personality', 'error');
      personalityInput.focus();
      return;
    }

    // Save to storage
    try {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      await chrome.storage.sync.set({
        openai_api_key: apiKey,
        personality: personality
      });

      showStatus('Settings saved successfully!', 'success');
      
      // Test API key validity (optional)
      setTimeout(() => {
        testApiKey(apiKey);
      }, 1000);

    } catch (error) {
      console.error('Error saving settings:', error);
      showStatus('Error saving settings. Please try again.', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Settings';
    }
  });

  // Auto-save on personality change (debounced)
  let personalityTimeout;
  personalityInput.addEventListener('input', () => {
    clearTimeout(personalityTimeout);
    personalityTimeout = setTimeout(async () => {
      const personality = personalityInput.value.trim();
      if (personality) {
        try {
          await chrome.storage.sync.set({ personality });
          console.log('Personality auto-saved');
        } catch (error) {
          console.error('Error auto-saving personality:', error);
        }
      }
    }, 1000);
  });
});

function showStatus(message, type) {
  const statusMessage = document.getElementById('status-message');
  statusMessage.textContent = message;
  statusMessage.className = `status-message status-${type}`;
  statusMessage.style.display = 'block';

  // Hide after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 5000);
  }
}

async function testApiKey(apiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const hasGpt4Nano = data.data.some(model => model.id.includes('gpt-4.1-nano') || model.id.includes('gpt-4'));
      
      if (hasGpt4Nano) {
        showStatus('Settings saved and API key verified successfully!', 'success');
      } else {
        showStatus('Settings saved. Note: GPT-4.1-nano model may not be available with your API key.', 'success');
      }
    } else if (response.status === 401) {
      showStatus('Settings saved, but API key appears to be invalid. Please check your key.', 'error');
    } else {
      showStatus('Settings saved. Could not verify API key at this time.', 'success');
    }
  } catch (error) {
    console.error('Error testing API key:', error);
    // Don't show error for API test failure, settings were still saved
    showStatus('Settings saved successfully!', 'success');
  }
}