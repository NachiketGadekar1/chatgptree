(function() {
  'use strict';

  // Keep client-side languages separate.
  const CLIENT_SIDE_LANGUAGES = ['html', 'javascript', 'js'];
  // Cache for Piston runtimes.
  let pistonRuntimes = null;
  let pistonRuntimesMap = new Map();

  // Initialize by fetching Piston runtimes from the background script.
  async function initializeRunner() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'GET_PISTON_RUNTIMES' });
      if (response && response.runtimes) {
        pistonRuntimes = response.runtimes;
        // Create a map for quick lookups by language name or alias
        pistonRuntimesMap.clear();
        pistonRuntimes.forEach(runtime => {
            pistonRuntimesMap.set(runtime.language, runtime);
            if(runtime.aliases) {
                runtime.aliases.forEach(alias => pistonRuntimesMap.set(alias, runtime));
            }
        });
        console.log('[ChatGPTree] Runner initialized with Piston runtimes.');
        // Once runtimes are loaded, process any existing code blocks.
        processNewCodeBlocks();
      } else {
        console.warn('[ChatGPTree] Could not get Piston runtimes from background script.');
        pistonRuntimes = []; // Ensure it's not null to prevent re-initialization
      }
    } catch (e) {
      console.error('[ChatGPTree] Error initializing runner:', e);
      pistonRuntimes = []; // Mark as initialized even on error
    }
  }

  function processNewCodeBlocks() {
    // Don't run if runtimes haven't been loaded yet.
    if (pistonRuntimes === null) {
      return;
    }
    const codeBlocks = document.querySelectorAll(
      'pre:not([data-chatgptree-runner-processed]), div.rounded-2xl.bg-token-sidebar-surface-primary:not([data-chatgptree-runner-processed])'
    );
    codeBlocks.forEach(injectRunnerUI);
  }

  function injectRunnerUI(codeBlockContainer) {
    if (codeBlockContainer.closest('[data-chatgptree-runner-processed]')) {
      return;
    }
    codeBlockContainer.setAttribute('data-chatgptree-runner-processed', 'true');

    let lang = '';
    const langHeader = codeBlockContainer.querySelector('.text-token-text-secondary.px-4');
    if (langHeader) {
      lang = langHeader.textContent.toLowerCase().trim();
    } else {
      const codeElement = codeBlockContainer.querySelector('code');
      const langClass = codeElement ? Array.from(codeElement.classList).find(c => c.startsWith('language-')) : null;
      if (langClass) {
        lang = langClass.replace('language-', '');
      }
    }

    // Check both client-side and Piston languages
    const isClientSide = CLIENT_SIDE_LANGUAGES.includes(lang);
    const isPistonSupported = pistonRuntimesMap.has(lang);

    if (isClientSide || isPistonSupported) {
      const runnerContainer = document.createElement('div');
      runnerContainer.className = 'chatgptree-runner-container';
      const runButton = document.createElement('button');
      runButton.className = 'chatgptree-run-btn';
      runButton.textContent = '▶️ Run Code';
      runButton.dataset.language = lang;
      runButton.addEventListener('click', handleRunClick);
      runnerContainer.appendChild(runButton);
      codeBlockContainer.insertAdjacentElement('afterend', runnerContainer);
    }
  }

  // Confirmation dialog for Piston API
  function showPistonConsentDialog(onConfirm) {
      const overlay = document.createElement('div');
      overlay.className = 'chatgptree-consent-overlay';
      overlay.innerHTML = `
          <div class="chatgptree-consent-dialog">
              <h3 class="chatgptree-consent-title">Third-Party Code Execution</h3>
              <p class="chatgptree-consent-text">
                  To run this language, your code will be sent to the public Piston API at 
                  <a href="https://emkc.org/" target="_blank" rel="noopener noreferrer">emkc.org</a> for execution. 
                  This is a free, third-party service. Do not send sensitive or private code.
              </p>
              <div class="chatgptree-consent-buttons">
                  <button class="chatgptree-consent-btn cancel">Cancel</button>
                  <button class="chatgptree-consent-btn confirm">OK, I Understand</button>
              </div>
          </div>
      `;
      document.body.appendChild(overlay);

      overlay.querySelector('.confirm').onclick = () => {
          chrome.storage.local.set({ piston_consent: true });
          onConfirm(true);
          overlay.remove();
      };
      overlay.querySelector('.cancel').onclick = () => {
          onConfirm(false);
          overlay.remove();
      };
  }
  
  async function handleRunClick(event) {
    const button = event.currentTarget;
    const runnerContainer = button.closest('.chatgptree-runner-container');
    const codeBlockContainer = runnerContainer.previousElementSibling;
    const language = button.dataset.language;

    if (!codeBlockContainer) {
      console.error('Could not find the code block container for this button.');
      return;
    }
    
    // Toggle visibility of output
    const existingOutput = runnerContainer.nextElementSibling;
    if (existingOutput && existingOutput.classList.contains('chatgptree-output-container')) {
      existingOutput.remove();
      button.textContent = '▶️ Run Code';
      return;
    }

    const code = codeBlockContainer.querySelector('code')?.textContent || '';
    if (!code) return;

    // Create the iframe container
    const outputContainer = document.createElement('div');
    outputContainer.className = 'chatgptree-output-container';
    const iframe = document.createElement('iframe');
    iframe.className = 'chatgptree-output-iframe';
    iframe.src = chrome.runtime.getURL('runner.html');
    outputContainer.appendChild(iframe);
    runnerContainer.insertAdjacentElement('afterend', outputContainer);

    button.textContent = '🔽 Hide Output';

    iframe.onload = async () => {
        if (!iframe.contentWindow) return;

        if (CLIENT_SIDE_LANGUAGES.includes(language)) {
            iframe.contentWindow.postMessage({ type: 'EXECUTE_CODE', code, language }, '*');
        } else if (pistonRuntimesMap.has(language)) {
            const { piston_consent } = await chrome.storage.local.get('piston_consent');
            
            const execute = async () => {
                button.disabled = true;
                button.textContent = 'Running...';
                
                try {
                    const runtime = pistonRuntimesMap.get(language);
                    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            language: runtime.language,
                            version: runtime.version,
                            files: [{ content: code }]
                        })
                    });
                    const result = await response.json();
                    iframe.contentWindow.postMessage({ type: 'PISTON_RESULT', result, language }, '*');
                } catch (error) {
                    const result = { run: { stderr: `Execution failed: ${error.message}` } };
                    iframe.contentWindow.postMessage({ type: 'PISTON_RESULT', result, language }, '*');
                } finally {
                    button.disabled = false;
                    button.textContent = '🔽 Hide Output';
                }
            };
            
            if (piston_consent) {
                await execute();
            } else {
                showPistonConsentDialog(async (confirmed) => {
                    if (confirmed) {
                        await execute();
                    } else {
                        outputContainer.remove();
                        button.textContent = '▶️ Run Code';
                    }
                });
            }
        }
    };
  }

  window.chatGPTreeRunner = {
    processNewCodeBlocks
  };

  // Start the initialization process
  initializeRunner();
})();
