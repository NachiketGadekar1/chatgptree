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
        // --- START OF FIX ---
        const parser = new DOMParser();
        const doc = parser.parseFromString(code, "text/html");

        // 1. Find all scripts and store their code BEFORE manipulating the DOM.
        // This is the critical change. We extract the code to be executed later.
        const scriptsToRun = [];
        doc.querySelectorAll('script').forEach(script => scriptsToRun.push(script.textContent));

        // 2. Handle styles by scoping them to the visual output container.
        doc.querySelectorAll('style').forEach(styleTag => {
            const scopedStyle = document.createElement('style');
            scopedStyle.textContent = styleTag.textContent.replace(/\bbody\b/g, '#visual-output');
            visualOutput.appendChild(scopedStyle);
        });

        // 3. Append the initial static HTML content from the user's code.
        // This moves all nodes, including the now-empty <script> tags.
        visualOutput.append(...doc.body.childNodes);

        // 4. Now, execute the stored script code. Our interceptors for console.log
        // and document.body.innerHTML will correctly capture the output.
        scriptsToRun.forEach(scriptCode => {
            if (scriptCode) {
                try {
                    console.log('[HTML Runner] Evaluating script content...');
                    window.eval(scriptCode);
                } catch (e) {
                    console.error(`Error executing script: ${e.message}`);
                }
            }
        });
        // --- END OF FIX ---
      }
    } catch (e) {
      logEntries.style.color = 'red';
      logEntries.textContent = `Error: ${e.message}`;
    }
  }
});