// --- START OF FILE contentScript.js ---

(function addPromptJumpButtons() {
  console.log('ChatGPTree content script starting...');

  /**
   * Waits for the main chat interface to be ready before initializing.
   */
  async function waitForChat() {
    if (initRetryCount >= MAX_INIT_RETRIES) {
      console.log('Max retries reached for current attempt');
      initRetryCount = 0;
      return;
    }

    const mainElement = document.querySelector('main');
    const promptInput = document.getElementById('prompt-textarea');
    
    if (!mainElement || !promptInput) {
      initRetryCount++;
      await sleep(500);
      await waitForChat();
      return;
    }

    console.log('Chat interface detected, initializing...');
    initRetryCount = 0;
    await initialize();
  }

  /**
   * Initializes the extension's features for the current page.
   */
  async function initialize() {    
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
        injectStyles();
        setupObservers();
        renderTreeButton();
        createTreeOverlay();
        isInitialized = true;
      }

      renderTreeButton();
      renderButtons();
      replaceEditMessageButtons();

      if (isChatTrackable && currentChatId) {
          autosaveInterval = setInterval(() => saveTreeToStorage(currentChatId, treeData), 5000);
      }
  }

/**
 * Cleans up all injected UI and listeners before a page navigation.
 */
async function cleanup() {
  console.log('Running cleanup on navigation...');
  if (isChatTrackable && currentChatId) {
    await saveTreeToStorage(currentChatId, treeData);
  }
  if (autosaveInterval) clearInterval(autosaveInterval);

  // Remove all UI elements created by the script
  document.querySelector('.chatgptree-prompt-jump-stack')?.remove();
  document.querySelector('.chatgptree-tree-btn')?.remove();
  document.querySelector('.chatgptree-overlay')?.remove();
  
  // FIX: Thoroughly reset all state variables to prevent data from leaking between chats.
  // This is the most critical part for preventing "ghost nodes".
  treeData = { nodes: new Map(), branches: new Map(), activeBranch: [], branchStartId: null };
  viewState = { x: 0, y: 0, scale: 1, isInitialized: false }; // Completely reset view state
  hasCreatedRootButton = false;

  // Disconnect the observer to stop it from firing on the old page content
  if (observer) observer.disconnect();
  isInitialized = false;
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
            cleanup();
            initRetryCount = 0;
            waitForChat();
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
          // ADD THIS LINE TO PROCESS CODE BLOCKS
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
  window.getChatGPTreeViewState = () => viewState; // <-- ADD THIS LINE

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  setupLifecycleManager();
  waitForChat();

})();
// --- END OF FILE contentScript.js ---