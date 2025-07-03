// --- UPDATE runner_iframe.js ---
'use strict';

// This function creates the two-panel layout (visual + console)
function setupLayout() {
  document.head.innerHTML = `
    <style>
      body { 
        margin: 0; 
        display: flex; 
        flex-direction: column; 
        height: 100vh; 
        font-family: sans-serif;
        background-color: #fff;
      }
      #visual-output {
        flex: 1; /* Takes up available space */
        padding: 8px;
        border-bottom: 1px solid #ccc;
        overflow: auto; /* Add scrollbars if content is too big */
      }
      #console-log {
        flex-basis: 100px; /* Start with a fixed height */
        flex-shrink: 0;
        background-color: #23272f; /* Dark background for terminal */
        color: #e5e5e5;
        padding: 8px;
        overflow-y: auto;
        font-family: monospace;
        font-size: 0.9rem;
        resize: vertical; /* Allow user to resize the console panel */
      }
      .chatgptree-log-entry { 
        border-bottom: 1px solid #444; 
        padding: 4px 0;
        white-space: pre-wrap;
        word-break: break-all;
      }
    </style>
  `;
  document.body.innerHTML = `
    <div id="visual-output"></div>
    <div id="console-log"></div>
  `;
}

// This function intercepts methods that could wipe the page
function setupInterceptors(visualOutputDiv, consoleLogDiv) {
  // --- Intercept console.log ---
  const originalLog = console.log;
  console.log = function(...args) {
    originalLog.apply(console, args); // Keep original behavior
    const output = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
    const logEntry = document.createElement('div');
    logEntry.className = 'chatgptree-log-entry';
    logEntry.textContent = output;
    consoleLogDiv.appendChild(logEntry);
    consoleLogDiv.scrollTop = consoleLogDiv.scrollHeight; // Auto-scroll to bottom
  };

  // --- Intercept document.write ---
  // Redirect it to the visual output div
  let buffer = '';
  document.write = function(...args) {
    buffer += args.join('');
    visualOutputDiv.innerHTML = buffer;
  }
  document.writeln = function(...args) {
    buffer += args.join('') + '\n';
    visualOutputDiv.innerHTML = buffer;
  }

  // --- Intercept document.body.innerHTML ---
  // This is the most important part. We redirect the setter.
  Object.defineProperty(document.body, 'innerHTML', {
    set: function(value) {
      visualOutputDiv.innerHTML = value;
    },
    get: function() {
      return visualOutputDiv.innerHTML;
    },
    configurable: true
  });
}

window.addEventListener('message', (event) => {
  if (event.origin !== 'https://chat.openai.com' && event.origin !== 'https://chatgpt.com') {
    return;
  }

  const { type, code, language } = event.data;

  if (type === 'EXECUTE_CODE') {
    setupLayout();
    const visualOutput = document.getElementById('visual-output');
    const consoleLog = document.getElementById('console-log');
    
    try {
      if (language === 'javascript' || language === 'js') {
        // Setup all interceptors BEFORE running the script
        setupInterceptors(visualOutput, consoleLog);
        
        const script = document.createElement('script');
        script.textContent = code;
        document.head.appendChild(script); // Append to head to run before body is parsed

      } else if (language === 'html') {
        visualOutput.innerHTML = code;
      }
    } catch (e) {
      consoleLog.style.color = 'red';
      consoleLog.textContent = `Error: ${e.message}`;
    }
  }
});