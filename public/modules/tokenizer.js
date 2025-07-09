// --- START OF FILE modules/tokenizer.js ---

(function() {
  'use strict';

  // State
  const TOKEN_COUNTER_ID = 'chatgptree-token-counter';
  const TOKENIZER_GLOBAL = 'GPTTokenizer_o200k_base';

  /**
   * Queries all messages, calculates the total token count, and updates the UI.
   * It no longer handles visibility, only the calculation and text update.
   */
  function updateTokenCount() {
    try {
      // Don't proceed if the tokenizer library isn't loaded yet.
      if (typeof window[TOKENIZER_GLOBAL] === 'undefined' || !window[TOKENIZER_GLOBAL].encode) {
        return;
      }
      
      // Find the counter. If it doesn't exist for any reason, do nothing.
      // The main script is responsible for creating and showing it.
      const counterUI = document.getElementById(TOKEN_COUNTER_ID);
      if (!counterUI || counterUI.style.display === 'none') {
        // Also do nothing if the counter is meant to be hidden.
        return;
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
      // We don't remove the UI here, as that could interfere with the main script's lifecycle.
    }
  }

  /**
   * Removes the token counter UI from the DOM. Called on full extension disable.
   */
  function destroy() {
    const counterUI = document.getElementById(TOKEN_COUNTER_ID);
    if (counterUI) {
      counterUI.remove();
    }
  }

  /**
   * Initializes the token counter feature. In this case, it does very little,
   * as the main script handles the heavy lifting.
   */
  function initialize() {
    console.log('[ChatGPTree] Tokenizer module initialized.');
    // No need to do anything here, initialize() in contentScript.js will trigger the first update.
  }

  // Expose public methods to the global scope
  window.chatGPTreeTokenizer = {
    initialize,
    updateTokenCount,
    destroy
  };

})();