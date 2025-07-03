// --- UPDATE runner_iframe.js ---
'use strict';

// setupLayout() and setupInterceptors() functions remain the same.
function setupLayout() {
  document.head.innerHTML = `
    <style>
      body { margin: 0; display: flex; flex-direction: column; height: 100vh; font-family: sans-serif; background-color: #fff; }
      #console-area { flex-basis: 150px; flex-shrink: 0; background-color: #23272f; color: #e5e5e5; resize: vertical; overflow: hidden; display: flex; flex-direction: column; border-bottom: 1px solid #444; }
      .console-header { padding: 6px 10px; font-family: sans-serif; font-weight: 600; font-size: 0.9rem; background-color: #333742; border-bottom: 1px solid #444; user-select: none; }
      #log-entries { flex: 1; overflow-y: auto; padding: 8px; font-family: monospace; font-size: 0.9rem; }
      #visual-output { flex: 1; padding: 8px; overflow: auto; }
      .chatgptree-log-entry { border-bottom: 1px solid #444; padding: 4px 0; white-space: pre-wrap; word-break: break-all; }
      .chatgptree-log-alert { color: #facc15; font-weight: bold; }
    </style>
  `;
  document.body.innerHTML = `
    <div id="console-area"><div class="console-header">Console</div><div id="log-entries"></div></div>
    <div id="visual-output"></div>
  `;
}

function setupInterceptors(visualOutputDiv, logEntriesDiv) {
  const originalLog = console.log;
  console.log = function(...args) {
    originalLog.apply(console, args);
    const output = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
    const logEntry = document.createElement('div');
    logEntry.className = 'chatgptree-log-entry';
    logEntry.textContent = output;
    logEntriesDiv.appendChild(logEntry);
    logEntriesDiv.scrollTop = logEntriesDiv.scrollHeight;
  };

  window.alert = function(message) {
    console.log(`[Alert]: ${message}`);
    const lastLog = logEntriesDiv.lastChild;
    if (lastLog) { lastLog.classList.add('chatgptree-log-alert'); }
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
    const logEntries = document.getElementById('log-entries');
    
    setupInterceptors(visualOutput, logEntries);
    
    try {
      if (language === 'javascript' || language === 'js') {
        const script = document.createElement('script');
        script.textContent = code;
        document.head.appendChild(script);

      } else if (language === 'html') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(code, "text/html");

        doc.querySelectorAll('style').forEach(style => document.head.appendChild(style));
        visualOutput.innerHTML = doc.body.innerHTML;

        doc.querySelectorAll('script').forEach(scriptTag => {
          const scriptCode = scriptTag.textContent;
          if (scriptCode) {
            // --- THIS IS THE FIX ---
            // Use window.eval() to execute the script in the global scope,
            // making functions like sayHello() available to onclick handlers.
            console.log('[HTML Runner] Evaluating script content in global scope.');
            window.eval(scriptCode);
            // --- END FIX ---
          }
        });
      }
    } catch (e) {
      logEntries.style.color = 'red';
      logEntries.textContent = `Error: ${e.message}`;
    }
  }
});