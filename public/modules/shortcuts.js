(function() {
  'use strict';

  // The single source of truth for our listener
  let keydownListener = null;

  // Default shortcuts configuration
  // 'ctrl+enter' is handled by a special-case listener below.
const DEFAULT_SHORTCUTS = {
  'alt+t': '.chatgptree-tree-btn',
  'alt+c': '.chatgptree-expand-btn',
  'alt+b': 'button[aria-label="Create a branch here"]',
  'alt+p': 'button[data-testid="stop-button"]'
};

  /**
   * Builds a string representation of a keyboard event (e.g., "alt+t").
   * @param {KeyboardEvent} e - The keyboard event.
   * @returns {string} The normalized shortcut string.
   */
  function getKeyString(e) {
    let keyString = '';
    if (e.ctrlKey) keyString += 'ctrl+';
    if (e.metaKey) keyString += 'meta+';
    if (e.altKey) keyString += 'alt+';
    if (e.shiftKey) keyString += 'shift+';
    keyString += e.key.toLowerCase();
    return keyString;
  }

/**
 * Initializes the shortcut listener.
 */
async function initializeShortcuts() {
  if (keydownListener) {
    console.log('[ChatGPTree Shortcuts] Already initialized.');
    return;
  }

  let { chatgptree_shortcuts: shortcuts } = await chrome.storage.local.get('chatgptree_shortcuts');
  if (!shortcuts || Object.keys(shortcuts).length === 0) {
    console.log('[ChatGPTree Shortcuts] No shortcuts found in storage. Setting defaults.');
    await chrome.storage.local.set({ chatgptree_shortcuts: DEFAULT_SHORTCUTS });
    shortcuts = DEFAULT_SHORTCUTS;
  }

  keydownListener = (e) => {
    const activeElement = document.activeElement;

    // --- CONTEXT-AWARE HANDLER for Ctrl+Enter ---
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
      let buttonToClick = null;
      const branchEditorContainer = activeElement.closest('div[class*="bg-token-main-surface-tertiary"]');

      if (activeElement.tagName === 'TEXTAREA' && branchEditorContainer) {
        buttonToClick = branchEditorContainer.querySelector('button.btn.btn-primary');
      } else if (activeElement.id === 'chatgptree-composer-textarea') {
        buttonToClick = document.querySelector('#chatgptree-composer-send-btn');
      } else if (activeElement.id === 'prompt-textarea') {
        buttonToClick = document.querySelector('[data-testid="send-button"]');
      }

      if (buttonToClick) {
        e.preventDefault();
        e.stopPropagation();
        console.log(`[ChatGPTree Shortcuts] Triggering context-aware send for Ctrl+Enter.`);
        buttonToClick.click();
        return;
      }
    }

    // --- DYNAMIC SHORTCUT HANDLER for Alt + [1-9] ---
    if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey && e.key >= '1' && e.key <= '9') {
      const jumpButtons = document.querySelectorAll('.chatgptree-prompt-jump-btn');
      for (const btn of jumpButtons) {
        const indexSpan = btn.querySelector('.index');
        if (indexSpan && indexSpan.textContent.trim() === e.key) {
          e.preventDefault();
          e.stopPropagation();
          console.log(`[ChatGPTree Shortcuts] Triggering jump to prompt #${e.key}`);
          btn.click();
          return;
        }
      }
    }

    // --- GENERIC STATIC SHORTCUT HANDLER (from DEFAULT_SHORTCUTS) ---
    const pressedKey = getKeyString(e);
    const selector = shortcuts[pressedKey];

    if (selector) {
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.isContentEditable)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      let targetElement = null;

      // THE FIX for Alt+B: Find the LAST matching element
      if (pressedKey === 'alt+b') {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          targetElement = elements[elements.length - 1];
        }
      } else {
        // Standard behavior for all other shortcuts (like Alt+P)
        targetElement = document.querySelector(selector);
      }
      
      if (targetElement) {
        console.log(`[ChatGPTree Shortcuts] Triggering action for "${pressedKey}" on element:`, targetElement);
        targetElement.click();
      }
    }
  };

  document.addEventListener('keydown', keydownListener, true);
  console.log('[ChatGPTree Shortcuts] Initialized and listening for key presses.');
}

  /**
   * Removes the shortcut listener from the document.
   */
  function destroyShortcuts() {
    if (keydownListener) {
      document.removeEventListener('keydown', keydownListener, true);
      keydownListener = null;
      console.log('[ChatGPTree Shortcuts] Listeners destroyed.');
    }
  }

  window.chatGPTreeShortcuts = {
    initializeShortcuts,
    destroyShortcuts
  };
})();