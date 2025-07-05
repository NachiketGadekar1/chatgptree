(function addPromptJumpButtons() {
  console.log('ChatGPTree content script starting...');

  /**
   * Waits for the main chat interface to be ready before initializing.
   * This is a robust polling mechanism that won't give up.
   */
  function waitForChat() {
    console.log('[ChatGPTree DBG] Starting waitForChat poll...');
    let pollCount = 0;
    const intervalId = setInterval(() => {
        pollCount++;
        const mainElement = document.querySelector('main');
        const promptInput = document.getElementById('prompt-textarea');
        
        // Log the status on each poll attempt
        console.log(`[ChatGPTree DBG] Poll #${pollCount}: mainElement found: ${!!mainElement}, promptInput found: ${!!promptInput}`);

        if (mainElement && promptInput) {
            console.log(`[ChatGPTree DBG] SUCCESS: Chat interface detected after ${pollCount} polls. Initializing.`);
            clearInterval(intervalId);
            initialize();
        } else if (pollCount > 40) { // Safety break after 10 seconds
            console.error('[ChatGPTree DBG] ERROR: Timed out waiting for chat interface. Aborting initialization for this page.');
            clearInterval(intervalId);
        }
    }, 250); // Check every 250ms
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
          isNewlyCreatedChat = false; // Reset flag
      } else if (currentChatId) {
          const savedTree = await loadTreeFromStorage(currentChatId);
          if (savedTree) {
              treeData = savedTree;
              isChatTrackable = true;
          } else {
              isChatTrackable = false;
          }
      } else {
          isChatTrackable = true; // New chat page
      }

      if (!isChatTrackable || isNewlyCreatedChat || !currentChatId) {
          treeData = { nodes: new Map(), branches: new Map(), activeBranch: [], branchStartId: null };
      }

      if (!isInitialized) {
          console.log('[ChatGPTree DBG] First-time initialization: injecting styles, setting up observers and overlays.');
          injectStyles();
          setupObservers();
          // The composer overlay is now created globally at the start
          createTreeOverlay();
          isInitialized = true;
      }

      // These functions render the UI that gets cleaned up on each navigation
      renderTreeButton();
      renderButtons();
      replaceEditMessageButtons();
      renderExpandComposerButton(); // This will now be reliably called

      if (isChatTrackable && currentChatId) {
          autosaveInterval = setInterval(() => saveTreeToStorage(currentChatId, treeData), 5000);
      }
      console.log('[ChatGPTree DBG] --- Finished initialize() ---');
  }

/**
 * Cleans up all injected UI and listeners before a page navigation.
 */
async function cleanup() {
    console.log('[ChatGPTree DBG] --- Running cleanup() ---');
    if (isChatTrackable && currentChatId) {
        await saveTreeToStorage(currentChatId, treeData);
    }
    if (autosaveInterval) clearInterval(autosaveInterval);

    // Remove all UI elements created by the script
    document.querySelector('.chatgptree-prompt-jump-stack')?.remove();
    document.querySelector('.chatgptree-tree-btn')?.remove();
    document.querySelector('.chatgptree-overlay')?.remove();
    document.querySelector('.chatgptree-expand-btn')?.remove();
    // Composer overlay is global and not removed

    // The class cleanup is no longer needed.

    // Reset state variables
    treeData = { nodes: new Map(), branches: new Map(), activeBranch: [], branchStartId: null };
    viewState = { x: 0, y: 0, scale: 1, isInitialized: false };

    // FIX: Only reset the root button flag if we are NOT in the middle of creating a new chat.
    // This preserves the state during the initial URL change from "/" to "/c/new-id".
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

    function onNewChatCreated() {
      isNewlyCreatedChat = true;
    }

    function handleMouseClick(event) {
      if (isCurrentlyOnNewChatPage && event.target.closest('[data-testid="send-button"]')) {
        onNewChatCreated();
      }
    }

    function handleKeyPress(event) {
      if (isCurrentlyOnNewChatPage && event.key === 'Enter' && !event.shiftKey && event.target.id === 'prompt-textarea') {
        onNewChatCreated();
      }
    }

    function checkPageType() {
        isCurrentlyOnNewChatPage = !window.location.pathname.startsWith('/c/');
    }
    
    function urlPollingLoop() {
        if (window.location.href !== lastCheckedUrl) {
            console.log(`[ChatGPTree DBG] URL change detected. From: ${lastCheckedUrl} To: ${window.location.href}`);
            cleanup();
            waitForChat(); // This now starts the robust polling
            lastCheckedUrl = window.location.href;
            checkPageType();
        }
        requestAnimationFrame(urlPollingLoop);
    }

    document.body.addEventListener('click', handleMouseClick, true);
    document.body.addEventListener('keydown', handleKeyPress, true);
    checkPageType();
    urlPollingLoop();
  }

  /**
   * Sets up MutationObserver to watch for dynamic changes in the chat.
   */
  function setupObservers() {
      const chatRoot = document.querySelector('main');
      if (!chatRoot) return;
      
      observer = new MutationObserver(() => {
          setTimeout(() => {
            updateTreeData(getUserPrompts());
            renderButtons();
            replaceEditMessageButtons();
            renderExpandComposerButton(); // Observer keeps this up-to-date
            
            if (window.chatGPTreeRunner) window.chatGPTreeRunner.processNewCodeBlocks();
            
            const overlay = document.querySelector('.chatgptree-overlay');
            if (overlay?.classList.contains('visible')) {
              updateTreeVisualization();
            }
          }, 100);
      });

      observer.observe(chatRoot, { childList: true, subtree: true });
  }

  // ============================================================================
  // DEBUGGING HELPERS
  // ============================================================================
  window.getChatGPTreeData = () => serializeTreeForStorage(treeData);
  window.searchChatGPTree = (targetMessageId) => findNodeAndPathDfs(treeData, targetMessageId);
  window.getChatGPTreeViewState = () => viewState;

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  // Create persistent UI once
  createComposerOverlay(); 
  // Start the lifecycle manager and initial page check
  setupLifecycleManager();
  waitForChat();

})();