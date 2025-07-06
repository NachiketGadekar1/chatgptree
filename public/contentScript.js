(function() {
  'use strict';
  
  // ============================================================================
  // GLOBAL STATE & CONTROL
  // ============================================================================
  let isExtensionGloballyEnabled = false;
  let animationFrameId = null;
  let lifecycleHandlers = {};

  /**
   * Creates the composer overlay and attaches its event listeners.
   * This is now self-contained within contentScript.js.
   */
  function createComposerOverlay() {
      if (document.querySelector('.chatgptree-composer-overlay')) return;

      const overlay = document.createElement('div');
      overlay.className = 'chatgptree-composer-overlay';
      overlay.innerHTML = `
        <div class="chatgptree-composer-container">
          <h3 class="chatgptree-composer-title">Expanded Composer</h3>
          <button class="chatgptree-composer-close-btn">×</button>
          <textarea id="chatgptree-composer-textarea" placeholder="Type your message here..."></textarea>
          <button id="chatgptree-composer-send-btn">Send Message</button>
        </div>
      `;
      document.body.appendChild(overlay);

      const sendBtn = overlay.querySelector('#chatgptree-composer-send-btn');
      const textarea = overlay.querySelector('#chatgptree-composer-textarea');

      // These listeners now correctly reference functions within this same file.
      if (sendBtn) sendBtn.onclick = handleSendFromOverlay;
      if (textarea) {
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
   * This is now self-contained within contentScript.js.
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
   * It now self-heals by creating the overlay if it doesn't exist.
   */
  function toggleComposerOverlay() {
      console.log('[ChatGPTree DBG] toggleComposerOverlay() called.');
      let overlay = document.querySelector('.chatgptree-composer-overlay');

      // --- THE FIX ---
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
      } else {
          document.removeEventListener('keydown', handleComposerEscapeKey);
      }
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
    console.log('[ChatGPTree DBG] Global click detected. Target:', target);

    // --- Composer Button ---
    const expandBtn = target.closest('.chatgptree-expand-btn');
    if (expandBtn) {
      console.log('[ChatGPTree DBG] Matched: Expand Composer Button. Preventing default action and calling toggleComposerOverlay().');
      event.preventDefault();
      event.stopPropagation();
      toggleComposerOverlay();
      return;
    }

    // --- Tree View Button ---
    const treeBtn = target.closest('.chatgptree-tree-btn');
    if (treeBtn && !treeBtn.disabled) {
      console.log('[ChatGPTree DBG] Matched: Tree View Button.');
      event.preventDefault();
      event.stopPropagation();
      toggleTreeOverlay();
      return;
    }
    
    // --- Tree View Close Button ---
    const treeCloseBtn = target.closest('.chatgptree-close-btn');
    if (treeCloseBtn) {
        console.log('[ChatGPTree DBG] Matched: Tree View Close Button.');
        event.preventDefault();
        event.stopPropagation();
        toggleTreeOverlay();
        return;
    }

    // --- Composer Close Button ---
    const composerCloseBtn = target.closest('.chatgptree-composer-close-btn');
    if (composerCloseBtn) {
        console.log('[ChatGPTree DBG] Matched: Composer Close Button.');
        event.preventDefault();
        event.stopPropagation();
        toggleComposerOverlay();
        return;
    }

    // --- Jump-to-Prompt Button ---
    const jumpBtn = target.closest('.chatgptree-prompt-jump-btn');
    if (jumpBtn && jumpBtn.dataset.targetMessageId) {
        console.log('[ChatGPTree DBG] Matched: Jump-to-Prompt Button.');
        event.preventDefault();
        event.stopPropagation();
        scrollToPromptById(jumpBtn.dataset.targetMessageId, true);
        return;
    }
    console.log('[ChatGPTree DBG] Click did not match any known UI element.');
  }

  /**
   * Enables all extension functionality.
   */
  function enableExtension() {
    if (isExtensionGloballyEnabled) return;
    console.log('[ChatGPTree] Enabling extension...');
    isExtensionGloballyEnabled = true;

    // Add the master click listener
    document.body.addEventListener('click', handleGlobalClick, true);

    createComposerOverlay();
    setupLifecycleManager();
    waitForChat();
  }

  /**
   * Disables all extension functionality and cleans up the DOM.
   */
  function disableExtension() {
    if (!isExtensionGloballyEnabled) return;
    console.log('[ChatGPTree] Disabling extension...');
    
    // Remove the master click listener
    document.body.removeEventListener('click', handleGlobalClick, true);

    stopLifecycleManager();
    cleanup();

    document.querySelector('.chatgptree-composer-overlay')?.remove();
    
    if (window.chatGPTreeObserver) {
        window.chatGPTreeObserver.disconnect();
        window.chatGPTreeObserver = null;
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
   * Waits for the main chat interface to be ready before initializing.
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
        
        console.log(`[ChatGPTree DBG] Poll #${pollCount}: mainElement found: ${!!mainElement}, promptInput found: ${!!promptInput}`);

        if (mainElement && promptInput) {
            console.log(`[ChatGPTree DBG] SUCCESS: Chat interface detected. Initializing.`);
            clearInterval(intervalId);
            initialize();
        } else if (pollCount > 40) {
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

      document.querySelector('.chatgptree-prompt-jump-stack')?.remove();
      document.querySelector('.chatgptree-tree-btn')?.remove();
      document.querySelector('.chatgptree-overlay')?.remove();
      document.querySelector('.chatgptree-expand-btn')?.remove();
      
      treeData = { nodes: new Map(), branches: new Map(), activeBranch: [], branchStartId: null };
      viewState = { x: 0, y: 0, scale: 1, isInitialized: false };

      if (!isNewlyCreatedChat) {
          hasCreatedRootButton = false;
      }

      if (observer) observer.disconnect();
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
   * Sets up MutationObserver to watch for dynamic changes in the chat.
   */
  function setupObservers() {
      const chatRoot = document.querySelector('main');
      if (!chatRoot) return;
      
      window.chatGPTreeObserver = new MutationObserver(() => {
          setTimeout(() => {
            if (!isExtensionGloballyEnabled) return;
            updateTreeData(getUserPrompts());
            renderButtons();
            replaceEditMessageButtons();
            renderExpandComposerButton();
            
            if (window.chatGPTreeRunner) window.chatGPTreeRunner.processNewCodeBlocks();
            
            const overlay = document.querySelector('.chatgptree-overlay');
            if (overlay?.classList.contains('visible')) {
              updateTreeVisualization();
            }
          }, 100);
      });

      window.chatGPTreeObserver.observe(chatRoot, { childList: true, subtree: true });
      observer = window.chatGPTreeObserver;
  }

  // ============================================================================
  // DEBUGGING HELPERS & INITIALIZATION
  // ============================================================================
  window.getChatGPTreeData = () => serializeTreeForStorage(treeData);
  window.searchChatGPTree = (targetMessageId) => findNodeAndPathDfs(treeData, targetMessageId);
  window.getChatGPTreeViewState = () => viewState;

  // Start the extension by default
  enableExtension();

})();