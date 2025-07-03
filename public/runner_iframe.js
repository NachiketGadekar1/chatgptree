// --- UPDATE runner_iframe.js ---
'use strict';

// setupLayout() function remains the same.
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
        flex: 1;
        padding: 8px;
        border-bottom: 1px solid #ccc;
        overflow: auto;
      }
      #console-log {
        flex-basis: 100px;
        flex-shrink: 0;
        background-color: #23272f;
        color: #e5e5e5;
        padding: 8px;
        overflow-y: auto;
        font-family: monospace;
        font-size: 0.9rem;
        resize: vertical;
      }
      .chatgptree-log-entry { 
        border-bottom: 1px solid #444; 
        padding: 4px 0;
        white-space: pre-wrap;
        word-break: break-all;
      }
      .chatgptree-log-alert {
        color: #facc15; /* Yellow color for alerts */
        font-weight: bold;
      }
    </style>
  `;
  document.body.innerHTML = `
    <div id="visual-output"></div>
    <div id="console-log"></div>
  `;
}

// setupInterceptors() is now updated to handle alert().
function setupInterceptors(visualOutputDiv, consoleLogDiv) {
  const originalLog = console.log;
  console.log = function(...args) {
    originalLog.apply(console, args);
    const output = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
    const logEntry = document.createElement('div');
    logEntry.className = 'chatgptree-log-entry';
    logEntry.textContent = output;
    consoleLogDiv.appendChild(logEntry);
    consoleLogDiv.scrollTop = consoleLogDiv.scrollHeight;
  };

  // --- FIX: Intercept alert() ---
  // This prevents the blocking popup and turns it into a log message.
  window.alert = function(message) {
    // We use our overridden console.log to display it in the terminal.
    console.log(`[Alert]: ${message}`);
    
    // Add a specific class for styling alert messages differently.
    const lastLog = consoleLogDiv.lastChild;
    if (lastLog) {
      lastLog.classList.add('chatgptree-log-alert');
    }
  };

  let buffer = '';
  document.write = function(...args) { buffer += args.join(''); visualOutputDiv.innerHTML = buffer; }
  document.writeln = function(...args) { buffer += args.join('') + '\n'; visualOutputDiv.innerHTML = buffer; }

  Object.defineProperty(document.body, 'innerHTML', {
    set: function(value) { visualOutputDiv.innerHTML = value; },
    get: function() { return visualOutputDiv.innerHTML; },
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
    
    setupInterceptors(visualOutput, consoleLog);
    
    try {
      if (language === 'javascript' || language === 'js') {
        const script = document.createElement('script');
        script.textContent = code;
        document.head.appendChild(script);

      } else if (language === 'html') {
        // --- ADDED DEBUGGING ---
        console.log('[HTML Runner] Starting HTML processing.');
        const parser = new DOMParser();
        const doc = parser.parseFromString(code, "text/html");

        doc.querySelectorAll('style').forEach(style => document.head.appendChild(style));
        console.log(`[HTML Runner] Found and appended ${doc.querySelectorAll('style').length} <style> tags.`);

        visualOutput.innerHTML = doc.body.innerHTML;
        console.log('[HTML Runner] Set visual output from parsed body.');

        const scriptTags = doc.querySelectorAll('script');
        console.log(`[HTML Runner] Found ${scriptTags.length} <script> tags to execute.`);

        scriptTags.forEach((scriptTag, index) => {
          const scriptCode = scriptTag.textContent;
          console.log(`[HTML Runner] Processing script #${index + 1}. Content:`, scriptCode);
          
          const newScript = document.createElement('script');
          newScript.textContent = scriptCode;
          document.head.appendChild(newScript);
          console.log(`[HTML Runner] Script #${index + 1} appended to head for execution.`);
        });
      }
    } catch (e) {
      console.log(`[Error]: ${e.message}`); // Use our logger to show errors
    }
  }
});