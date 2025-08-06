# XGuy - AI-Powered X Assistant 🤖

A Chrome extension that generates personalized replies and suggests original posts for X.com using GPT-4.1-nano AI, featuring intelligent thread detection, post storage, and engagement pattern analysis.

![Extension Logo](XGuy.png)

## ✨ Features

### **Core Functionality**
- **🎯 Smart Reply Generation**: Uses GPT-4.1-nano to create personalized, contextual replies
- **✨ Post Suggestions**: AI-generated original post ideas based on your engagement patterns  
- **🧵 Intelligent Thread Detection**: Properly detects real threads vs random comments
- **📊 Engagement Analysis**: Learns from your interactions to suggest relevant content

### **User Experience**
- **⚡ Dual Keyboard Shortcuts**: 
  - `Ctrl+Shift+R`: Generate replies
  - `Ctrl+Shift+S`: Suggest new posts
- **💭 User Insights**: Add your own context about posts before generating
- **🎨 Personality Customization**: Configure your reply style and personality
- **📋 Clipboard Integration**: Reliable copy-to-clipboard functionality

### **Smart Features**
- **🧠 Pattern Recognition**: Analyzes your interests (tech, business, AI, etc.)
- **⏰ 24-Hour Post Storage**: Automatically expires old interaction data
- **🎭 Style Learning**: Adapts suggestions to match your typical engagement style
- **🔒 Privacy First**: All data stored locally, expires automatically

## 🚀 Installation

### Prerequisites
- Chrome browser (latest version recommended)
- OpenAI API key with GPT-4.1-nano access

### Steps
1. **Download or Clone** this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top right)
4. **Click "Load unpacked"** and select the `replybot` folder
5. **Configure XGuy**:
   - Click the XGuy extension icon in Chrome's toolbar
   - Go to Settings
   - Enter your OpenAI API key
   - Set your desired reply personality

## 🎮 Usage

### **Reply Generation**
1. **Navigate** to any post on x.com
2. **Press** `Ctrl+Shift+R` while viewing a post
3. **Add insights** (optional) about the post in the modal that appears
4. **Click "Generate Reply"**
5. **Copy and paste** the generated reply (automatically copied to clipboard)

### **Post Suggestions** ✨ *NEW*
1. **Generate some replies first** to build your interaction history
2. **Press** `Ctrl+Shift+S` anywhere on X
3. **Review your recent interactions** shown in the modal
4. **Click "Generate Suggestion"** to get AI-powered post ideas
5. **Edit and copy** the suggested post to use as inspiration

### **Smart Thread Detection**
XGuy now properly identifies:
- **Real threads**: Posts with "1/5", "2/5" numbering or thread indicators 🧵
- **Conversation threads**: Connected replies in a discussion
- **Ignores**: Random comments that aren't actually threaded

### **Keyboard Shortcuts**
- **Generate Replies**: `Ctrl+Shift+R`
- **Suggest Posts**: `Ctrl+Shift+S` *(NEW)*
- **Generate** (when modal is open): `Ctrl+Enter`
- **Close modal**: `Escape`

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
- **Reply Generation**: 30-second timeout with thread context analysis
- **Post Suggestions**: 45-second timeout for complex engagement analysis
- Handles both single posts and multi-post threads
- Custom prompting for personality-based responses
- **Smart Analysis**: Extracts themes, patterns, and user preferences from interactions

### Security & Privacy
- API keys stored securely using Chrome's encrypted sync storage
- **Local Storage**: All interaction data stored locally in browser
- **Auto-Expiry**: Post data automatically deleted after 24 hours
- **No Tracking**: No analytics, external servers, or data collection
- Content Security Policy compliant
- Secure API calls only to OpenAI

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