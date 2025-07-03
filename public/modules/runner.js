// --- UPDATE modules/runner.js ---
(function() {
  'use strict';

  const CLIENT_SIDE_LANGUAGES = ['html', 'javascript', 'js'];

  function processNewCodeBlocks() {
    const codeBlocks = document.querySelectorAll('pre:not([data-chatgptree-runner-processed])');
    codeBlocks.forEach(injectRunnerUI);
  }

  function injectRunnerUI(preElement) {
    preElement.setAttribute('data-chatgptree-runner-processed', 'true');
    const langDiv = preElement.querySelector('div > div:first-child');
    const lang = langDiv ? langDiv.textContent.toLowerCase().trim() : '';

    if (CLIENT_SIDE_LANGUAGES.includes(lang)) {
      const runnerContainer = document.createElement('div');
      runnerContainer.className = 'chatgptree-runner-container';
      const renderButton = document.createElement('button');
      renderButton.className = 'chatgptree-render-btn';
      renderButton.textContent = '▶️ Render';
      renderButton.dataset.language = lang;
      renderButton.addEventListener('click', handleRenderClick);
      runnerContainer.appendChild(renderButton);
      preElement.insertAdjacentElement('afterend', runnerContainer);
    }
  }

  /**
   * Handles the click event for the "Render" button.
   * @param {MouseEvent} event The click event.
   */
  function handleRenderClick(event) {
    const button = event.currentTarget;
    const runnerContainer = button.closest('.chatgptree-runner-container');
    const preElement = runnerContainer.previousElementSibling;

    if (!preElement || preElement.tagName !== 'PRE') {
      console.error('Could not find the <pre> element for this button.');
      return;
    }

    // Allow toggling the output view
    const existingOutput = runnerContainer.nextElementSibling;
    if (existingOutput && existingOutput.classList.contains('chatgptree-output-container')) {
      existingOutput.remove();
      button.textContent = '▶️ Render';
      return;
    }

    const code = preElement.querySelector('code')?.textContent || '';
    const language = button.dataset.language;
    if (!code) return;

    const outputContainer = document.createElement('div');
    outputContainer.className = 'chatgptree-output-container';

    const iframe = document.createElement('iframe');
    iframe.className = 'chatgptree-output-iframe';
    
    // The `sandbox` attribute is removed from here.
    // The sandboxing is now correctly handled by the manifest.json file,
    // which applies the sandbox and a special CSP to `runner.html`.

    // Set the source to our local extension file
    iframe.src = chrome.runtime.getURL('runner.html');

    // Wait for the iframe to load before sending the message
    iframe.onload = () => {
      // Use postMessage to securely send data to the iframe
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'EXECUTE_CODE',
          code: code,
          language: language
        }, '*'); // Sending to a specific target is best, but '*' is safe for extension->extension communication.
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