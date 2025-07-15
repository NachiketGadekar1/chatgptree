'use strict';

function setupLayout(language) {
  // Determine layout based on language. Only 'html' gets the visual pane.
  const isTextOnly = language !== 'html';

  document.head.innerHTML = `
    <style>
      :root {
        --chatgptree-dark-bg: #23272f;
        --chatgptree-green: #6ee7b7;
        --chatgptree-light-text: #e5e5e5;
        --chatgptree-dark-text: #23272f;
        --chatgptree-border-light: #444;
        --chatgptree-stderr-red: #f87171;
      }
      ::-webkit-scrollbar { width: 8px; }
      ::-webkit-scrollbar-track { background: var(--chatgptree-dark-bg); }
      ::-webkit-scrollbar-thumb { background: #555; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: var(--chatgptree-green); }

      body { 
        margin: 0; 
        display: flex; 
        flex-direction: column; 
        height: 100vh; 
        font-family: sans-serif; 
        background-color: var(--chatgptree-dark-bg);
        position: relative; /* For the overlay */
      }
      #visual-output { 
        flex: 1; 
        padding: 8px; 
        overflow: auto; 
        background-color: #fff;
        display: ${isTextOnly ? 'none' : 'block'};
      }
      #console-area { 
        flex-shrink: 0; 
        background-color: var(--chatgptree-dark-bg); 
        color: var(--chatgptree-light-text); 
        overflow: hidden; 
        display: flex; 
        flex-direction: column;
        flex-basis: ${isTextOnly ? '100%' : '200px'};
        resize: ${isTextOnly ? 'none' : 'vertical'};
        border-top: ${isTextOnly ? 'none' : '2px solid var(--chatgptree-green)'};
      }
      .console-header { 
        padding: 6px 12px; 
        font-family: sans-serif; 
        font-weight: 600; 
        font-size: 0.9rem; 
        background-color: var(--chatgptree-dark-bg);
        color: var(--chatgptree-green);
        border-bottom: 1px solid var(--chatgptree-border-light); 
        user-select: none;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      #log-entries { 
        flex: 1; 
        overflow-y: auto; 
        padding: 8px 12px; 
        font-family: monospace; 
        font-size: 0.9rem;
      }
      .chatgptree-log-entry { 
        border-bottom: 1px solid var(--chatgptree-border-light); 
        padding: 4px 0; 
        white-space: pre-wrap; 
        word-break: break-all;
      }
      .chatgptree-log-alert { color: #facc15; font-weight: bold; }
      .chatgptree-log-stderr { color: var(--chatgptree-stderr-red); }

      /* Loading Spinner Styles */
      #loading-overlay {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: var(--chatgptree-dark-bg);
        display: none; /* Initially hidden */
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 16px;
        color: var(--chatgptree-light-text);
        font-family: monospace;
        font-size: 1rem;
        z-index: 10;
      }
      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 255, 255, 0.2);
        border-top-color: var(--chatgptree-green);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
  document.body.innerHTML = `
    <div id="loading-overlay">
      <div class="spinner"></div>
      <div>Running code...</div>
    </div>
    <div id="visual-output"></div>
    <div id="console-area"><div class="console-header">🌳Output</div><div id="log-entries"></div></div>
  `;
}

function logToConsole(message, type = 'log') {
    const logEntriesDiv = document.getElementById('log-entries');
    if (!logEntriesDiv) return;

    const entry = document.createElement('div');
    entry.className = 'chatgptree-log-entry';
    if (type === 'stderr') {
        entry.classList.add('chatgptree-log-stderr');
    } else if (type === 'alert') {
        entry.classList.add('chatgptree-log-alert');
    }
    entry.textContent = message;
    logEntriesDiv.appendChild(entry);
    logEntriesDiv.scrollTop = logEntriesDiv.scrollHeight;
}

function setupInterceptors(visualOutputDiv) {
  console.log = (...args) => {
    const output = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
    logToConsole(output, 'log');
  };
  console.error = (...args) => {
    const output = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
    logToConsole(output, 'stderr');
  };
  window.alert = message => logToConsole(`[Alert]: ${message}`, 'alert');
  
  // Intercept document writes for client-side HTML
  if (visualOutputDiv) {
    let buffer = '';
    document.write = (...args) => { buffer += args.join(''); visualOutputDiv.innerHTML = buffer; }
    document.writeln = (...args) => { buffer += args.join('') + '\n'; visualOutputDiv.innerHTML = buffer; }
    Object.defineProperty(document.body, 'innerHTML', {
      set: value => { visualOutputDiv.innerHTML = value; },
      get: () => visualOutputDiv.innerHTML,
      configurable: true
    });
  }
}

window.addEventListener('message', (event) => {
  if (event.origin !== 'https://chat.openai.com' && event.origin !== 'https://chatgpt.com') {
    return;
  }

  const { type, code, language, result } = event.data;

  // Setup layout and interceptors on the first message for this iframe instance
  if (!document.getElementById('console-area')) {
      setupLayout(language);
      const visualOutput = document.getElementById('visual-output');
      setupInterceptors(visualOutput);
  }

  const loadingOverlay = document.getElementById('loading-overlay');

  if (type === 'SHOW_LOADING') {
      if (loadingOverlay) loadingOverlay.style.display = 'flex';
  } else if (type === 'EXECUTE_CODE') {
    try {
      if (language === 'javascript' || language === 'js') {
        const script = document.createElement('script');
        script.textContent = code;
        document.head.appendChild(script).remove(); // Append, run, and remove
      } else if (language === 'html') {
        const visualOutput = document.getElementById('visual-output');
        const parser = new DOMParser();
        const doc = parser.parseFromString(code, "text/html");
        const scriptsToRun = [];
        doc.querySelectorAll('script').forEach(script => scriptsToRun.push(script.textContent));
        doc.querySelectorAll('style').forEach(styleTag => {
            const scopedStyle = document.createElement('style');
            scopedStyle.textContent = styleTag.textContent.replace(/\bbody\b/g, '#visual-output');
            visualOutput.appendChild(scopedStyle);
        });
        visualOutput.append(...doc.body.childNodes);
        scriptsToRun.forEach(scriptCode => {
            if (scriptCode) {
                try { window.eval(scriptCode); } catch (e) { console.error(`Error executing script: ${e.message}`); }
            }
        });
      }
    } catch (e) {
      console.error(`Error: ${e.message}`);
    }
  } else if (type === 'PISTON_RESULT') {
      if (loadingOverlay) loadingOverlay.style.display = 'none';
      
      // Priority 1: Handle a fundamentally invalid response from the API.
      if (!result) {
        logToConsole('[Execution Error]: Received an invalid or empty response from the API.', 'stderr');
        return; // Stop processing
      }

      let hasPrintedOutput = false;

      // Priority 2: Check for a critical process termination signal. This is the most important failure reason.
      // We must check `result.run` exists to prevent a TypeError.
      if (result.run && result.run.signal) {
          logToConsole(`[Execution Error]: Process was terminated by signal: ${result.run.signal}. This is often caused by excessive memory usage, infinite loops, or the code taking too long to run.`, 'stderr');
          hasPrintedOutput = true;
      }

      // Priority 3: Check for a top-level API message (e.g., compile errors).
      if (result.message) {
          logToConsole(`[Piston API Message]: ${result.message}`, 'stderr');
          hasPrintedOutput = true;
      }

      // Priority 4: If the process wasn't killed, check for standard error output.
      if (result.run && !result.run.signal && result.run.stderr) {
          logToConsole(result.run.stderr, 'stderr');
          hasPrintedOutput = true;
      }

      // Priority 5: If the process wasn't killed and had no errors, check for standard output.
      if (result.run && !result.run.signal && result.run.stdout) {
          logToConsole(result.run.stdout, 'log');
          hasPrintedOutput = true;
      }

      // Priority 6: The final fallback. If nothing has been printed yet, the code ran successfully with no output.
      if (!hasPrintedOutput) {
          logToConsole('[Execution completed with no output]', 'log');
      }
  }
});