// --- CREATE NEW FILE modules/runner.js ---

(function() {
  'use strict';

  const CLIENT_SIDE_LANGUAGES = ['html', 'javascript', 'js'];

  /**
   * Finds all code blocks on the page that haven't been processed yet and injects UI.
   */
  function processNewCodeBlocks() {
    const codeBlocks = document.querySelectorAll('pre:not([data-chatgptree-runner-processed])');
    codeBlocks.forEach(injectRunnerUI);
  }

  /**
   * Injects the runner UI (e.g., a "Render" button) for a single code block.
   * @param {HTMLPreElement} preElement The <pre> element containing the code.
   */
  function injectRunnerUI(preElement) {
    preElement.setAttribute('data-chatgptree-runner-processed', 'true');

    // Extract language from the header div provided by ChatGPT's UI
    const langDiv = preElement.querySelector('div > div:first-child');
    const lang = langDiv ? langDiv.textContent.toLowerCase().trim() : '';

    if (CLIENT_SIDE_LANGUAGES.includes(lang)) {
      const runnerContainer = document.createElement('div');
      runnerContainer.className = 'chatgptree-runner-container';

      const renderButton = document.createElement('button');
      renderButton.className = 'chatgptree-render-btn';
      renderButton.textContent = '▶️ Render';
      renderButton.dataset.language = lang; // Store language for the handler

      renderButton.addEventListener('click', handleRenderClick);

      runnerContainer.appendChild(renderButton);
      // Insert the button container directly after the <pre> element
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
    iframe.sandbox = 'allow-scripts'; // Securely sandbox the iframe

    let srcDoc = '';
    if (language === 'html') {
      srcDoc = code;
    } else if (language === 'javascript' || language === 'js') {
      srcDoc = `
        <!DOCTYPE html>
        <html>
          <head><title>JS Runner</title></head>
          <body>
            <script>${code}<\/script>
          </body>
        </html>
      `;
    }

    iframe.srcdoc = srcDoc;

    outputContainer.appendChild(iframe);
    // Insert the output container directly after the button container
    runnerContainer.insertAdjacentElement('afterend', outputContainer);
    button.textContent = '🔽 Hide Output';
  }

  // Expose the main function to be called by contentScript.js
  window.chatGPTreeRunner = {
    processNewCodeBlocks
  };

})();