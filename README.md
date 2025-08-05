# X.com Reply Bot 🤖

A Chrome extension that generates personalized replies to X.com (Twitter) posts using GPT-4.1-nano AI, with thread detection and contextual understanding.

![Extension Logo](XGuy.png)

## ✨ Features

- **🎯 Smart Reply Generation**: Uses GPT-4.1-nano to create personalized, contextual replies
- **🧵 Thread Detection**: Automatically detects and analyzes entire Twitter threads for better context
- **⚡ Keyboard Shortcut**: Quick activation with `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
- **💭 User Insights**: Add your own context about posts before generating replies
- **🎨 Personality Customization**: Configure your reply style and personality
- **📋 Clipboard Integration**: Reliable copy-to-clipboard with auto-opening reply box
- **🔒 Secure Storage**: Encrypted API key storage using Chrome's sync storage

## 🚀 Installation

### Prerequisites
- Chrome browser (latest version recommended)
- OpenAI API key with GPT-4.1-nano access

### Steps
1. **Download or Clone** this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top right)
4. **Click "Load unpacked"** and select the `replybot` folder
5. **Configure the extension**:
   - Click the extension icon in Chrome's toolbar
   - Go to Settings
   - Enter your OpenAI API key
   - Set your desired reply personality

## 🎮 Usage

### Basic Usage
1. **Navigate** to any post on x.com or twitter.com
2. **Press** `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac) while viewing a post
3. **Add insights** (optional) about the post in the modal that appears
4. **Click "Generate Reply"**
5. **Paste** the generated reply using `Ctrl+V` (automatically copied to clipboard)

### Thread Support
The extension automatically detects Twitter threads and provides complete context to the AI for more informed replies. When replying to a thread, you'll see "Thread detected! Context:" with all related tweets.

### Keyboard Shortcuts
- `Ctrl+Shift+R` / `Cmd+Shift+R`: Activate reply generation
- `Ctrl+Enter` / `Cmd+Enter`: Generate reply (when modal is open)
- `Escape`: Close modal

## ⚙️ Configuration

### API Key Setup
1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Ensure you have access to GPT-4.1-nano model
3. Add the key in extension settings

### Personality Configuration
Customize your reply style by setting personality descriptions like:
- "friendly and helpful"
- "witty and sarcastic" 
- "professional and informative"
- "casual and humorous"

## 🔧 Technical Details

### Architecture
- **Manifest V3** Chrome extension
- **Content Script**: Handles X.com DOM interaction and thread detection
- **Background Script**: Manages GPT-4.1-nano API calls
- **Options Page**: Configuration interface
- **Popup**: Quick status and settings access

### API Integration
- Uses OpenAI's GPT-4.1-nano model (`gpt-4.1-nano-2025-04-14`)
- Includes timeout protection (30 seconds)
- Handles both single tweets and multi-tweet threads
- Custom prompting for personality-based responses

### Security
- API keys stored securely using Chrome's encrypted sync storage
- No external dependencies or CDNs
- Content Security Policy compliant
- Local processing with secure API calls

## 🛠️ Development

### File Structure
```
replybot/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for API calls
├── content.js            # X.com DOM interaction
├── modal.css             # UI styling
├── options.html/js       # Settings page
├── popup.html/js         # Extension popup
├── XGuy.png             # Extension icon
├── README.md            # This file
└── CHANGELOG.md         # Version history
```

### Local Development
1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click reload button on the extension
4. Test on x.com

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## 💰 Pricing

### Extension Usage
- Free to use (open source)

### API Costs
- GPT-4.1-nano: $0.10 per million input tokens, $0.40 per million output tokens
- Typical reply generation: ~$0.001-0.005 per use
- You pay OpenAI directly for API usage

## 🐛 Troubleshooting

### Common Issues

**"Couldn't extract tweet text"**
- Try clicking directly on the tweet text before using the shortcut
- Refresh the page and try again

**"API key not configured"**
- Go to extension settings and add your OpenAI API key
- Ensure the key has GPT-4.1-nano access

**Extension not responding**
- Reload the extension in `chrome://extensions/`
- Check if you're on x.com or twitter.com
- Try refreshing the webpage

**Reply button stays disabled**
- Use the clipboard copy feature (it's more reliable)
- Paste the generated reply manually with Ctrl+V

## 🔒 Privacy

- No user data is stored or transmitted except to OpenAI for reply generation
- API keys are encrypted and stored locally
- No analytics or tracking
- No external servers except OpenAI API

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/x-reply-bot/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/x-reply-bot/discussions)

## 🙏 Acknowledgments

- OpenAI for GPT-4.1-nano API
- Chrome Extensions team for the robust platform
- Twitter/X.com for the social platform

---

**Made with ❤️ for better social media interactions**