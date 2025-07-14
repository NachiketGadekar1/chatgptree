(function() {
  'use strict';
  
  // ============================================================================
  // GLOBAL STATE & CONTROL
  // ============================================================================
  let isExtensionGloballyEnabled = false;
  let animationFrameId = null;
  let lifecycleHandlers = {};
  let debouncedRenderButtons = null;
  let bookmarks = new Map();
  let chatHistoryObserver = null;

  /**
   * Loads bookmarks from chrome.storage.local into the global map.
   */
  async function loadBookmarks() {
    try {
      const result = await chrome.storage.local.get('chatgptree_bookmarks');
      const storedBookmarks = result.chatgptree_bookmarks || [];
      bookmarks = new Map(storedBookmarks.map(b => [b.id, b]));
      console.log(`[ChatGPTree] Loaded ${bookmarks.size} bookmarks.`);
    } catch (error) {
      console.error('[ChatGPTree] Error loading bookmarks:', error);
      bookmarks = new Map();
    }
  }

  /**
   * Saves the current bookmarks map to chrome.storage.local.
   */
  async function saveBookmarks() {
    try {
      const bookmarksArray = Array.from(bookmarks.values());
      await chrome.storage.local.set({ 'chatgptree_bookmarks': bookmarksArray });
      chrome.runtime.sendMessage({ action: 'BOOKMARKS_UPDATED' });
    } catch (error) {
      console.error('[ChatGPTree] Error saving bookmarks:', error);
    }
  }

  /**
   * Toggles the bookmark state for a given chat ID.
   * @param {string} chatId - The ID of the chat to bookmark/unbookmark.
   * @param {string} chatTitle - The title of the chat.
   * @param {HTMLElement} buttonElement - The star button element.
   */
  function toggleBookmark(chatId, chatTitle, buttonElement) {
    if (bookmarks.has(chatId)) {
      bookmarks.delete(chatId);
      buttonElement.classList.remove('active');
      buttonElement.setAttribute('aria-label', 'Add bookmark');
    } else {
      bookmarks.set(chatId, { id: chatId, title: chatTitle });
      buttonElement.classList.add('active');
      buttonElement.setAttribute('aria-label', 'Remove bookmark');
    }
    saveBookmarks();
  }


    /**
   * Centralized function to control the token counter's visibility.
   * This function is the single source of truth for whether the counter should be shown.
   */
  window.updateTokenCounterVisibility = function() {
    const tokenCounter = document.getElementById('chatgptree-token-counter');
    if (!tokenCounter) return;

    const isTreeVisible = document.querySelector('.chatgptree-overlay.visible');
    const isComposerVisible = document.querySelector('.chatgptree-composer-overlay.visible');

    // If any overlay is open, ALWAYS hide the counter.
    if (isTreeVisible || isComposerVisible) {
      tokenCounter.style.display = 'none';
      return;
    }

    // Otherwise, apply the primary rule: show only on an active chat page.
    if (currentChatId) {
      tokenCounter.style.display = 'block';
    } else {
      tokenCounter.style.display = 'none';
    }
  }

/**
 * Creates the composer overlay and attaches its event listeners.
 */
function createComposerOverlay() {
    if (document.querySelector('.chatgptree-composer-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'chatgptree-composer-overlay';
    overlay.innerHTML = `
      <div class="chatgptree-composer-container">
        <h3 class="chatgptree-composer-title">Expanded Composer</h3>
        <button class="chatgptree-composer-close-btn" title="Close Composer (Esc)">×</button>
        <textarea id="chatgptree-composer-textarea" placeholder="Type your message here..."></textarea>
        <div class="chatgptree-composer-bottom-row">
          <div id="chatgptree-autocomplete-bar"></div>
          <button id="chatgptree-composer-send-btn">Send Message</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const sendBtn = overlay.querySelector('#chatgptree-composer-send-btn');
    const textarea = overlay.querySelector('#chatgptree-composer-textarea');

    // These listeners now correctly reference functions within this same file.
    if (sendBtn) sendBtn.onclick = handleSendFromOverlay;
    if (textarea) {
        // Reverted to simpler, more robust logic.
        // The autocomplete keydown handler will prevent this from firing when it's active.
        textarea.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent new line
                handleSendFromOverlay();
            }
        };
    }
}

  /**
   * Pastes text from our overlay into the real chatbox and clicks send.
   */
  function handleSendFromOverlay() {
      const sourceTextarea = document.getElementById('chatgptree-composer-textarea');
      const targetInput = document.querySelector('div#prompt-textarea[contenteditable="true"]');

      if (!sourceTextarea || !targetInput) {
          showToast('Error: ChatGPT input not found.', 5000, 'error');
          return;
      }
      
      const textToSend = sourceTextarea.value;
      if (!textToSend.trim()) return;

      targetInput.innerHTML = `<p>${textToSend.replace(/\n/g, '<br>')}</p>`;
      targetInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      
      setTimeout(() => {
          const realSendButton = document.querySelector('[data-testid="send-button"]');
          if (realSendButton) {
              realSendButton.click();
              sourceTextarea.value = '';
              toggleComposerOverlay(); // This now correctly calls the local function
          } else {
              showToast('Error: Could not activate ChatGPT send button.', 5000, 'error');
          }
      }, 100);
  }

/**
 * Toggles the visibility of the composer overlay.
 * It self-heals by creating the overlay if it doesn't exist.
 */
function toggleComposerOverlay() {
    console.log('[ChatGPTree DBG] toggleComposerOverlay() called.');
    let overlay = document.querySelector('.chatgptree-composer-overlay');

    // If the overlay doesn't exist (e.g., wiped by React), create it now.
    if (!overlay) {
        console.warn('[ChatGPTree DBG] Composer overlay not found. Re-creating it now.');
        createComposerOverlay(); // This function from ui.js creates and appends the overlay.
        overlay = document.querySelector('.chatgptree-composer-overlay'); // Re-query the DOM to get the new reference.
    }

    const textarea = overlay ? overlay.querySelector('#chatgptree-composer-textarea') : null;
    
    if (!overlay || !textarea) {
        console.error('[ChatGPTree DBG] FATAL: Failed to find or create the composer overlay. Aborting.');
        return;
    }
    console.log('[ChatGPTree DBG] Overlay and textarea found. Toggling visibility.');

    const isVisible = overlay.classList.toggle('visible');

    if (isVisible) {
        textarea.focus();
        document.addEventListener('keydown', handleComposerEscapeKey);
        // Initialize autocomplete when composer opens
        if (window.chatGPTreeAutocomplete) {
            window.chatGPTreeAutocomplete.initialize(textarea);
        }
    } else {
        document.removeEventListener('keydown', handleComposerEscapeKey);
        // Destroy autocomplete when composer closes
        if (window.chatGPTreeAutocomplete) {
            window.chatGPTreeAutocomplete.destroy();
        }
    }
    
    // Update the counter's visibility whenever the composer is toggled.
    window.updateTokenCounterVisibility(); 
}


  /**
   * Handles the 'Escape' key to close the composer overlay.
   */
  function handleComposerEscapeKey(e) {
    if (e.key === 'Escape') {
      toggleComposerOverlay();
    }
  }

  /**
   * Master click handler using event delegation with added debugging.
   * Catches clicks on our UI elements, regardless of when they are added to the DOM.
   * @param {MouseEvent} event
   */
  function handleGlobalClick(event) {
    const target = event.target;
    // console.log('[ChatGPTree DBG] Global click detected. Target:', target); // Can be noisy

    // --- Bookmark Button ---
    const bookmarkBtn = target.closest('.chatgptree-bookmark-btn');
    if (bookmarkBtn) {
      event.preventDefault();
      event.stopPropagation();
      const chatId = bookmarkBtn.dataset.chatId;
      const chatTitle = bookmarkBtn.dataset.chatTitle;
      if (chatId && chatTitle) {
        toggleBookmark(chatId, chatTitle, bookmarkBtn);
      }
      return;
    }

    // --- Composer Button ---
    const expandBtn = target.closest('.chatgptree-expand-btn');
    if (expandBtn) {
      event.preventDefault();
      event.stopPropagation();
      toggleComposerOverlay();
      return;
    }

    // --- Tree View Button ---
    const treeBtn = target.closest('.chatgptree-tree-btn');
    if (treeBtn) {
      event.preventDefault();
      event.stopPropagation();
      // Check for the '.disabled' class instead of the property ---
      if (treeBtn.classList.contains('disabled')) {
        showToast('Tree view is disabled for chats created before installing the extension.', 5000, 'info');
      } else {
        toggleTreeOverlay();
      }
      return;
    }
    
    // --- Tree View Close Button ---
    const treeCloseBtn = target.closest('.chatgptree-close-btn');
    if (treeCloseBtn) {
        event.preventDefault();
        event.stopPropagation();
        toggleTreeOverlay();
        return;
    }


    // --- Composer Close Button ---
    const composerCloseBtn = target.closest('.chatgptree-composer-close-btn');
    if (composerCloseBtn) {
        event.preventDefault();
        event.stopPropagation();
        toggleComposerOverlay();
        return;
    }

    // --- Jump-to-Prompt Button ---
    const jumpBtn = target.closest('.chatgptree-prompt-jump-btn');
    if (jumpBtn && jumpBtn.dataset.targetMessageId) {
        event.preventDefault();
        event.stopPropagation();
        scrollToPromptById(jumpBtn.dataset.targetMessageId, true);
        return;
    }
  }

  /**
   * Master mouse hover handler for delegated events, like tooltips.
   * @param {MouseEvent} event
   */
  function handleGlobalMouseover(event) {
      const target = event.target;
      
      // --- Jump Button Tooltip ---
      const jumpBtn = target.closest('.chatgptree-prompt-jump-btn');
      if (jumpBtn) {
          showJumpTooltip(jumpBtn);
      }
  }

  /**
   * Master mouse out handler for delegated events.
   * @param {MouseEvent} event
   */
  function handleGlobalMouseout(event) {
      const target = event.target;

      // --- Jump Button Tooltip ---
      const jumpBtn = target.closest('.chatgptree-prompt-jump-btn');
      if (jumpBtn) {
          // Check if the relatedTarget (where the mouse is going) is part of the tooltip itself.
          // This check is often complex; a simpler approach is to just hide it.
          hideJumpTooltip();
      }
  }

  /**
   * Enables all extension functionality.
   */
  async function enableExtension() {
    if (isExtensionGloballyEnabled) return;
    console.log('[ChatGPTree] Enabling extension...');
    isExtensionGloballyEnabled = true;

    // Load bookmarks first
    await loadBookmarks();

    // Add master event listeners
    document.body.addEventListener('click', handleGlobalClick, true);
    document.body.addEventListener('mouseover', handleGlobalMouseover);
    document.body.addEventListener('mouseout', handleGlobalMouseout);

    // Debounced resize handler for jump buttons
    debouncedRenderButtons = debounce(renderButtons, 150);
    window.addEventListener('resize', debouncedRenderButtons);

    // Initialize shortcuts
    if (window.chatGPTreeShortcuts) {
      window.chatGPTreeShortcuts.initializeShortcuts();
    }

    // Initialize tokenizer
    if (window.chatGPTreeTokenizer) {
      window.chatGPTreeTokenizer.initialize();
    }

    createComposerOverlay();
    createJumpTooltip(); // Create the tooltip element
    setupLifecycleManager();
    waitForChat();
  }

  /**
   * Disables all extension functionality and cleans up the DOM.
   */
  function disableExtension() {
    if (!isExtensionGloballyEnabled) return;
    console.log('[ChatGPTree] Disabling extension...');
    
    // Remove master event listeners
    document.body.removeEventListener('click', handleGlobalClick, true);
    document.body.removeEventListener('mouseover', handleGlobalMouseover);
    document.body.removeEventListener('mouseout', handleGlobalMouseout);
    
    // Remove resize handler
    if (debouncedRenderButtons) {
        window.removeEventListener('resize', debouncedRenderButtons);
        debouncedRenderButtons = null;
    }

    // Destroy shortcuts listener
    if (window.chatGPTreeShortcuts) {
      window.chatGPTreeShortcuts.destroyShortcuts();
    }

    // Destroy tokenizer
    if (window.chatGPTreeTokenizer) {
      window.chatGPTreeTokenizer.destroy();
    }

    stopLifecycleManager();
    cleanup();

    document.querySelector('.chatgptree-composer-overlay')?.remove();
    document.querySelector('.chatgptree-token-counter')?.remove();
    document.getElementById('chatgptree-jump-tooltip')?.remove();
    document.querySelectorAll('.chatgptree-bookmark-btn').forEach(btn => btn.remove());
    
    if (window.chatGPTreeObserver) {
        window.chatGPTreeObserver.disconnect();
        window.chatGPTreeObserver = null;
    }
    if (chatHistoryObserver) {
        chatHistoryObserver.disconnect();
        chatHistoryObserver = null;
    }

    isExtensionGloballyEnabled = false;
    console.log('[ChatGPTree] Extension disabled.');
  }

  // Listen for toggle messages from the sidebar
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'TOGGLE_EXTENSION') {
      if (message.enabled) {
        enableExtension();
      } else {
        disableExtension();
      }
      sendResponse({ status: 'ok' });
    }
    return true;
  });


  /**
   * Waits for the main chat interface and navigation to be ready before initializing.
   */
  function waitForChat() {
    console.log('[ChatGPTree DBG] Starting waitForChat poll...');
    let pollCount = 0;
    const intervalId = setInterval(() => {
        if (!isExtensionGloballyEnabled) {
          clearInterval(intervalId);
          return;
        }
        pollCount++;
        const mainElement = document.querySelector('main');
        const promptInput = document.getElementById('prompt-textarea');
        const navElement = document.querySelector('nav'); // Check for the nav sidebar
        
        console.log(`[ChatGPTree DBG] Poll #${pollCount}: main: ${!!mainElement}, prompt: ${!!promptInput}, nav: ${!!navElement}`);

        if (mainElement && promptInput && navElement) { // Ensure navElement is also present
            console.log(`[ChatGPTree DBG] SUCCESS: Chat interface detected. Initializing.`);
            clearInterval(intervalId);
            initialize();
        } else if (pollCount > 40) { // Timeout after 10 seconds
            console.error('[ChatGPTree DBG] ERROR: Timed out waiting for chat interface.');
            clearInterval(intervalId);
        }
    }, 250);
  }

/**
 * Initializes the extension's features for the current page.
 */
async function initialize() {
    console.log('[ChatGPTree DBG] +++ Running initialize() +++');
    currentUrl = window.location.href;
    currentChatId = getChatIdFromUrl();

    if (autosaveInterval) clearInterval(autosaveInterval);

    if (isNewlyCreatedChat) {
        isChatTrackable = true;
        isNewlyCreatedChat = false;
    } else if (currentChatId) {
        const savedTree = await loadTreeFromStorage(currentChatId);
        if (savedTree) {
            treeData = savedTree;
            isChatTrackable = true;
        } else {
            isChatTrackable = false;
        }
    } else {
        isChatTrackable = true;
    }

    if (!isChatTrackable || isNewlyCreatedChat || !currentChatId) {
        treeData = { nodes: new Map(), branches: new Map(), activeBranch: [], branchStartId: null };
    }

    if (!isInitialized) {
        console.log('[ChatGPTree DBG] First-time initialization: injecting styles, setting up observers and overlays.');
        injectStyles();
        setupObservers();
        createTreeOverlay();
        isInitialized = true;
    }

    renderTokenCounter(); // Ensure the element exists on the page.

    // Replace the old logic with a single call to our new central function.
    window.updateTokenCounterVisibility(); 
    // Ask the tokenizer to perform a count if the counter is visible.
    if (window.chatGPTreeTokenizer) {
      window.chatGPTreeTokenizer.updateTokenCount();
    }
    
    renderTreeButton();
    renderButtons();
    replaceEditMessageButtons();
    renderExpandComposerButton();

    if (isChatTrackable && currentChatId) {
        autosaveInterval = setInterval(() => saveTreeToStorage(currentChatId, treeData), 5000);
    }
    console.log('[ChatGPTree DBG] --- Finished initialize() ---');
}

  /**
   * Cleans up all injected UI and listeners before a page navigation or full disable.
   */
  async function cleanup() {
      console.log('[ChatGPTree DBG] --- Running cleanup() ---');
      if (isChatTrackable && currentChatId) {
          await saveTreeToStorage(currentChatId, treeData);
      }
      if (autosaveInterval) clearInterval(autosaveInterval);

      document.querySelector('.chatgptree-prompt-jump-container')?.remove();
      document.querySelector('.chatgptree-tree-btn')?.remove();
      document.querySelector('.chatgptree-overlay')?.remove();
      document.querySelector('.chatgptree-expand-btn')?.remove();
      document.querySelectorAll('.chatgptree-bookmark-btn').forEach(btn => btn.remove());
      
      treeData = { nodes: new Map(), branches: new Map(), activeBranch: [], branchStartId: null };
      viewState = { x: 0, y: 0, scale: 1, isInitialized: false };

      if (!isNewlyCreatedChat) {
          hasCreatedRootButton = false;
      }

      // --- START: Robust observer cleanup ---
      if (observer) {
          observer.disconnect();
          observer = null;
      }
      if (window.chatGPTreeObserver) {
          window.chatGPTreeObserver.disconnect();
          window.chatGPTreeObserver = null;
      }
      if (chatHistoryObserver) {
          chatHistoryObserver.disconnect();
          chatHistoryObserver = null;
      }
      // --- END: Robust observer cleanup ---

      isInitialized = false;
      console.log('[ChatGPTree DBG] --- Finished cleanup() ---');
  }

  /**
   * Sets up the main URL polling loop to detect navigation between chats.
   */
  function setupLifecycleManager() {
    let isCurrentlyOnNewChatPage = false;
    let lastCheckedUrl = window.location.href;

    lifecycleHandlers = {
        onNewChatCreated: () => {
          isNewlyCreatedChat = true;
        },
        handleMouseClick: (event) => {
          if (isCurrentlyOnNewChatPage && event.target.closest('[data-testid="send-button"]')) {
            lifecycleHandlers.onNewChatCreated();
          }
        },
        handleKeyPress: (event) => {
          if (isCurrentlyOnNewChatPage && event.key === 'Enter' && !event.shiftKey && event.target.id === 'prompt-textarea') {
            lifecycleHandlers.onNewChatCreated();
          }
        },
        checkPageType: () => {
            isCurrentlyOnNewChatPage = !window.location.pathname.startsWith('/c/');
        },
        urlPollingLoop: () => {
            if (window.location.href !== lastCheckedUrl) {
                console.log(`[ChatGPTree DBG] URL change detected. From: ${lastCheckedUrl} To: ${window.location.href}`);
                cleanup();
                waitForChat();
                lastCheckedUrl = window.location.href;
                lifecycleHandlers.checkPageType();
            }
            animationFrameId = requestAnimationFrame(lifecycleHandlers.urlPollingLoop);
        }
    };

    document.body.addEventListener('click', lifecycleHandlers.handleMouseClick, true);
    document.body.addEventListener('keydown', lifecycleHandlers.handleKeyPress, true);
    lifecycleHandlers.checkPageType();
    lifecycleHandlers.urlPollingLoop();
  }

  /**
   * Stops the URL polling loop and removes associated event listeners.
   */
  function stopLifecycleManager() {
      if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
      }
      document.body.removeEventListener('click', lifecycleHandlers.handleMouseClick, true);
      document.body.removeEventListener('keydown', lifecycleHandlers.handleKeyPress, true);
      lifecycleHandlers = {}; // Clear handlers
  }


  /**
   * Sets up MutationObservers to watch for dynamic changes.
   * It uses an "inject and verify" loop for the chat history to robustly
   * handle client-side navigation and ensure bookmark stars are always present.
   */
  function setupObservers() {
      // Observer for main chat content
      const chatRoot = document.querySelector('main');
      if (chatRoot && !window.chatGPTreeObserver) {
        window.chatGPTreeObserver = new MutationObserver(() => {
            setTimeout(() => {
              if (!isExtensionGloballyEnabled) return;
              updateTreeData(getUserPrompts());
              renderButtons();
              replaceEditMessageButtons();
              renderExpandComposerButton();
              
              if (window.chatGPTreeRunner) window.chatGPTreeRunner.processNewCodeBlocks();
              if (window.chatGPTreeTokenizer) window.chatGPTreeTokenizer.updateTokenCount(); 
              
              const overlay = document.querySelector('.chatgptree-overlay');
              if (overlay?.classList.contains('visible')) {
                updateTreeVisualization();
              }
            }, 100);
        });
        window.chatGPTreeObserver.observe(chatRoot, { childList: true, subtree: true });
        observer = window.chatGPTreeObserver;
      }

      // --- START: New "Inject and Verify" Logic for Bookmarks ---
      if (chatHistoryObserver) {
        chatHistoryObserver.disconnect();
        chatHistoryObserver = null;
      }

      let attempts = 0;
      const maxAttempts = 40; // Poll for up to 10 seconds

      const ensureBookmarksExist = () => {
          if (!isExtensionGloballyEnabled || attempts >= maxAttempts) {
              if (attempts >= maxAttempts) {
                  console.error('[ChatGPTree] Failed to inject bookmark stars after multiple attempts.');
              }
              return;
          }

          // Step 1: Attempt to inject stars into any items that are missing one.
          renderBookmarkStars(bookmarks);

          // Step 2: Verify the injection.
          const chatItems = document.querySelectorAll('a[href^="/c/"]');
          const injectedStars = document.querySelectorAll('.chatgptree-bookmark-btn');

          // If there are chat items but not all of them have stars, React likely wiped them. Retry.
          if (chatItems.length > 0 && injectedStars.length < chatItems.length) {
              console.warn(`[ChatGPTree DBG] Verification failed. Found ${chatItems.length} chats but only ${injectedStars.length} stars. Retrying... (Attempt ${attempts + 1})`);
              attempts++;
              setTimeout(ensureBookmarksExist, 250);
              return;
          }

          // If there are no chat items yet (e.g., page is still loading), wait and retry.
          if (chatItems.length === 0 && attempts < maxAttempts) {
              console.warn(`[ChatGPTree DBG] No chat items found yet. Retrying... (Attempt ${attempts + 1})`);
              attempts++;
              setTimeout(ensureBookmarksExist, 250);
              return;
          }

          // Step 3: Success! The DOM is stable. Attach the observer for future changes (like scrolling).
          console.log('[ChatGPTree DBG] Bookmark stars successfully verified in the DOM.');
          const nav = document.querySelector('nav');
          if (nav && !chatHistoryObserver) {
              chatHistoryObserver = new MutationObserver(
                  debounce(() => {
                      if (!isExtensionGloballyEnabled) return;
                      // This will fill in any gaps created by lazy-loading more chats.
                      renderBookmarkStars(bookmarks);
                  }, 250)
              );
              chatHistoryObserver.observe(nav, { childList: true, subtree: true });
          }
      };

      // Kick off the robust injection process.
      ensureBookmarksExist();
      // --- END: New "Inject and Verify" Logic ---
  }

  // ============================================================================
  // DEBUGGING HELPERS & INITIALIZATION
  // ============================================================================
  window.getChatGPTreeData = () => serializeTreeForStorage(treeData);
  window.searchChatGPTree = (targetMessageId) => findNodeAndPathDfs(treeData, targetMessageId);
  window.getChatGPTreeViewState = () => viewState;

  // Check initial state from storage and then enable/disable
  chrome.storage.local.get('chatgptree_enabled', (result) => {
    // Default to enabled if the value is not set (e.g., first install)
    const isEnabled = result.chatgptree_enabled !== false;
    if (isEnabled) {
      enableExtension();
    } else {
      console.log('[ChatGPTree] Extension is installed but currently disabled by user setting.');
    }
  });

})();