// --- FINAL UPDATE modules/runner.js ---
(function() {
  'use strict';

  const CLIENT_SIDE_LANGUAGES = ['html', 'javascript', 'js'];

  function processNewCodeBlocks() {
    const codeBlocks = document.querySelectorAll(
      'pre:not([data-chatgptree-runner-processed]), div.rounded-2xl.bg-token-sidebar-surface-primary:not([data-chatgptree-runner-processed])'
    );
    codeBlocks.forEach(injectRunnerUI);
  }

  function injectRunnerUI(codeBlockContainer) {
    // --- THIS IS THE FIX ---
    // If this container is inside another element that we have already processed,
    // stop immediately. This prevents adding a second button when a div is wrapped in a pre.
    if (codeBlockContainer.closest('[data-chatgptree-runner-processed]')) {
      return;
    }
    // --- END OF FIX ---

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

    if (CLIENT_SIDE_LANGUAGES.includes(lang)) {
      const runnerContainer = document.createElement('div');
      runnerContainer.className = 'chatgptree-runner-container';
      const renderButton = document.createElement('button');
      renderButton.className = 'chatgptree-render-btn';
      renderButton.textContent = '▶️ Render';
      renderButton.dataset.language = lang;
      renderButton.addEventListener('click', handleRenderClick);
      runnerContainer.appendChild(renderButton);
      codeBlockContainer.insertAdjacentElement('afterend', runnerContainer);
    }
  }

  function handleRenderClick(event) {
    const button = event.currentTarget;
    const runnerContainer = button.closest('.chatgptree-runner-container');
    const codeBlockContainer = runnerContainer.previousElementSibling;

    if (!codeBlockContainer) {
      console.error('Could not find the code block container for this button.');
      return;
    }

    const existingOutput = runnerContainer.nextElementSibling;
    if (existingOutput && existingOutput.classList.contains('chatgptree-output-container')) {
      existingOutput.remove();
      button.textContent = '▶️ Render';
      return;
    }

    const code = codeBlockContainer.querySelector('code')?.textContent || '';
    const language = button.dataset.language;
    if (!code) return;

    const outputContainer = document.createElement('div');
    outputContainer.className = 'chatgptree-output-container';

    const iframe = document.createElement('iframe');
    iframe.className = 'chatgptree-output-iframe';
    iframe.src = chrome.runtime.getURL('runner.html');

    iframe.onload = () => {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'EXECUTE_CODE',
          code: code,
          language: language
        }, '*');
      }
    };
    
    outputContainer.appendChild(iframe);
    runnerContainer.insertAdjacentElement('afterend', outputContainer);
    button.textContent = '🔽 Hide Output';
  }

  window.chatGPTreeRunner = {
    processNewCodeBlocks
  };
})();