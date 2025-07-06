// Replace the entire contents of modules/tokenizer.js with this final version.

(function() {
  'use strict';

  // State
  const TOKEN_COUNTER_ID = 'chatgptree-token-counter';
  const MODEL_SWITCHER_SELECTOR = '[data-testid="model-switcher-dropdown-button"]';
  const TOKENIZER_GLOBAL = 'GPTTokenizer_o200k_base';

  /**
   * Creates and injects the token counter UI element into the page header.
   * It ensures only one instance of the counter exists.
   * @returns {HTMLElement|null} The counter element or null if the target location is not found.
   */
  function renderTokenCounter() {
    if (document.getElementById(TOKEN_COUNTER_ID)) {
      return document.getElementById(TOKEN_COUNTER_ID);
    }

    const modelSwitcher = document.querySelector(MODEL_SWITCHER_SELECTOR);
    if (!modelSwitcher) {
      return null;
    }

    // The direct parent of the model switcher is the flex container we want to add our element to.
    const container = modelSwitcher.parentElement;
    if (!container) return null;

    const tokenCounterElement = document.createElement('div');
    tokenCounterElement.id = TOKEN_COUNTER_ID;
    tokenCounterElement.className = 'chatgptree-token-counter';
    
    // Append it to the same container as the model switcher. This makes it a sibling flex item.
    container.appendChild(tokenCounterElement);
    console.log("[ChatGPTree] Successfully injected final token counter element.");
    
    return tokenCounterElement;
  }

  /**
   * Queries all messages, calculates the total token count, and updates the UI.
   * This function is designed to be called frequently.
   */
  function updateTokenCount() {
    try {
      if (typeof window[TOKENIZER_GLOBAL] === 'undefined' || !window[TOKENIZER_GLOBAL].encode) {
        // Silently return if the library isn't ready. The observer will call this again.
        return;
      }
      
      let counterUI = document.getElementById(TOKEN_COUNTER_ID);
      if (!counterUI) {
        counterUI = renderTokenCounter();
        if (!counterUI) return; // Abort if we still can't render it.
      }

      const messageElements = document.querySelectorAll('[data-message-author-role="user"], [data-message-author-role="assistant"]');
      let fullText = '';
      messageElements.forEach(el => {
        fullText += el.textContent || '';
      });
      
      const tokenizer = window[TOKENIZER_GLOBAL];
      const tokens = tokenizer.encode(fullText);
      counterUI.textContent = `Total Tokens: ${tokens.length}`;

    } catch (error) {
      console.error('[ChatGPTree] Tokenizer Error:', error.message);
      const counterUI = document.getElementById(TOKEN_COUNTER_ID);
      if (counterUI) counterUI.remove();
    }
  }

  /**
   * Removes the token counter UI from the DOM.
   */
  function destroy() {
    const counterUI = document.getElementById(TOKEN_COUNTER_ID);
    if (counterUI) {
      counterUI.remove();
    }
  }

  /**
   * Initializes the token counter feature.
   */
  function initialize() {
    console.log('[ChatGPTree] Initializing final Token Counter.');
    updateTokenCount();
  }

  // Expose public methods to the global scope
  window.chatGPTreeTokenizer = {
    initialize,
    updateTokenCount,
    destroy
  };

})();