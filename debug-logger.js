// Debug Logger Utility for 𝕏Guy Extension
// Creates downloadable debug logs for troubleshooting

class DebugLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Keep last 1000 log entries
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data: data ? JSON.stringify(data, null, 2) : null,
      location: this.getLocation()
    };
    
    this.logs.push(logEntry);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Also log to console for immediate debugging
    const consoleMessage = `[${level.toUpperCase()}] ${message}`;
    if (data) {
      console[level === 'error' ? 'error' : 'log'](consoleMessage, data);
    } else {
      console[level === 'error' ? 'error' : 'log'](consoleMessage);
    }
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  error(message, data = null) {
    this.log('error', message, data);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  debug(message, data = null) {
    this.log('debug', message, data);
  }

  getLocation() {
    try {
      // Try to determine if we're in background or content script
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        if (chrome.runtime.getURL('').includes('background')) {
          return 'background';
        } else if (window.location.hostname.includes('x.com') || window.location.hostname.includes('twitter.com')) {
          return 'content';
        }
      }
      return 'unknown';
    } catch (e) {
      return 'unknown';
    }
  }

  downloadLogs() {
    const logText = this.logs.map(log => {
      let entry = `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.location}] ${log.message}`;
      if (log.data) {
        entry += `\nData: ${log.data}`;
      }
      return entry + '\n';
    }).join('');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `𝕏guy-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  clear() {
    this.logs = [];
    console.log('Debug logs cleared');
  }

  getLogsForDownload() {
    return this.logs;
  }
}

// Create global logger instance
const debugLogger = new DebugLogger();

// Add download function to window for easy access from console
if (typeof window !== 'undefined') {
  window.downloadDebugLogs = () => debugLogger.downloadLogs();
  window.clearDebugLogs = () => debugLogger.clear();
}