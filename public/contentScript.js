console.log('ChatGPTree content script starting...');

(function addPromptJumpButtons() {
  let currentUrl = '';
  let observer = null;
  let isInitialized = false;
  let initRetryCount = 0;
  let urlCheckInterval = null;
  const MAX_INIT_RETRIES = 10;
  // New state variables for persistence
  let currentChatId = null;
  let isChatTrackable = false;
  let isNewlyCreatedChat = false; // Flag to identify a chat we just created.
  
  // Tree data structure
  let treeData = {
    nodes: new Map(), // messageId -> { messageId, text, parentId, x, y, children: [] }
    branches: new Map(), // messageId -> [childMessageIds]
    activeBranch: [], // Current active branch - array of messageIds in order
    branchStartId: null // Track where branching started when regenerate is clicked
  };

  // Add a persistent state for the tree view's pan and zoom
  let viewState = {
    x: 0,
    y: 0,
    scale: 0.75, 
    isInitialized: false // Flag to track if the initial position has been set
  };

  function logCurrentView() {
    console.log(`
      viewState = {
        x: ${viewState.x},
        y: ${viewState.y},
        scale: ${viewState.scale},
        isInitialized: true
      };
    `);
  }
  // Expose the function to the global scope for console debugging
  window.logCurrentView = logCurrentView;

  function getChatIdFromUrl() {
    // Extracts the chat ID from a URL like https://chatgpt.com/c/xxxxxxxx-xxxx...
    const match = window.location.href.match(/\/c\/([a-f0-9-]+)/);
    return match ? match[1] : null;
  }

  // Add panning state variables at the top near other state variables
  let isPanning = false;
  let startPoint = { x: 0, y: 0 };
  let viewOffset = { x: 0, y: 0 };
  function waitForChat() {
    if (initRetryCount >= MAX_INIT_RETRIES) {
      console.log('Max retries reached for current attempt');
      initRetryCount = 0;
      return;
    }

    console.log('Attempting initialization, attempt:', initRetryCount + 1);
    const mainElement = document.querySelector('main');
    const promptInput = document.getElementById('prompt-textarea');
    
    // Check for the main container AND the prompt input, which exists on new and old chats.
    if (!mainElement || !promptInput) {
      initRetryCount++;
      setTimeout(waitForChat, 500);
      return;
    }

    console.log('Chat interface detected, initializing...');
    initRetryCount = 0;
    initialize();
  }  function initialize() {    console.log('Checking URL:', window.location.href);
    currentUrl = window.location.href;
    currentChatId = getChatIdFromUrl();

    // Determine the chat type based on the flag from the watcher or the URL.
    if (isNewlyCreatedChat) {
      // The watcher told us this is a brand new chat.
      isChatTrackable = true;
      console.log('@@@@ CHAT TYPE DETECTED: Brand New Chat');
      isNewlyCreatedChat = false; // Reset the flag, its job is done.
    } else if (currentChatId) {
      // No flag, but a chat ID exists. This is a genuinely pre-existing chat.
      isChatTrackable = false; 
      console.log('@@@@ CHAT TYPE DETECTED: Pre-existing Chat');
    } else {
      // No chat ID means it's a new session or a temporary chat.
      isChatTrackable = true;
      console.log('@@@@ CHAT TYPE DETECTED: New Session (No ID yet)');
    }

    // Reset tree data for new chat
    treeData.nodes = new Map();
    treeData.branches = new Map();
    treeData.activeBranch = [];
    treeData.branchStartId = null;

    if (!isInitialized) {
      injectStyles();
      setupObservers();
      startUrlWatcher();
      renderTreeButton();
      createTreeOverlay();
      isInitialized = true;
    }

    // Must re-render the button now that isChatTrackable is correctly set.
    renderTreeButton();

    console.log('Adding prompt jump buttons...');
    renderButtons();
  }

  function cleanup() {
    console.log('Running cleanup...');
    // Clean up prompt jump stack
    let stack = document.querySelector('.chatgptree-prompt-jump-stack');
    if (stack) {
      console.log('Removing button stack');
      stack.remove();
    }

    // Clean up tree visualization
    let treeBtn = document.querySelector('.chatgptree-tree-btn');
    if (treeBtn) {
      treeBtn.remove();
    }
    let overlay = document.querySelector('.chatgptree-overlay');
    if (overlay) {
      overlay.remove();
    }
    
    // Clear tree data
    console.log('Clearing tree data');
    treeData.nodes.clear();
    treeData.branches.clear();
    treeData.activeBranch = [];
    treeData.branchStartId = null;
    // Reset the view state for the next time the tree is opened
    viewState = { x: 0, y: 0, scale: 0.75, isInitialized: false };

    // Clean up observer
    if (observer) {
      console.log('Disconnecting observer');
      observer.disconnect();
      observer = null;
    }
    isInitialized = false;
  }
  function startUrlWatcher() {
    // Clear any existing interval
    if (urlCheckInterval) {
      clearInterval(urlCheckInterval);
    }    // Watch for URL changes persistently
    urlCheckInterval = setInterval(() => {
      const newUrl = window.location.href;
      if (newUrl !== currentUrl) {
        console.log('URL changed from:', currentUrl);
        console.log('URL changed to:', newUrl);

        // Check if we are transitioning from a state with NO chat ID to one WITH a chat ID.
        // This is the signature of a new chat being created.
        const newUrlHasId = /\/c\//.test(newUrl);
        if (!currentChatId && newUrlHasId) {
          console.log('Watcher detected a newly created chat.');
          isNewlyCreatedChat = true;
        } else {
          isNewlyCreatedChat = false;
        }

        cleanup();
        currentUrl = newUrl;
        // Reset retry count and start fresh
        initRetryCount = 0;
        waitForChat();
      }
    }, 1000);

    // Ensure interval is cleared when page is unloaded
    window.addEventListener('unload', () => {
      if (urlCheckInterval) {
        clearInterval(urlCheckInterval);
      }
    });
  }

function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .chatgptree-prompt-jump-stack {
        position: fixed;
        top: 120px;
        right: 24px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 12px;
        pointer-events: none;
      }
      .chatgptree-prompt-jump-btn {
        position: relative;
        width: 36px;
        height: 36px;
        padding: 0;
        margin: 0;
        border: none;
        background: none;
        cursor: pointer;
        outline: none;
        pointer-events: auto;
      }
      .chatgptree-prompt-jump-btn .btn-content {
        position: absolute;
        top: 0;
        right: 0;
        height: 36px;
        min-width: 36px;
        max-width: 36px;
        display: flex;
        align-items: center;
        background: rgba(35, 39, 47, 0.9);
        color: #6ee7b7;
        border: 2px solid #6ee7b7;
        border-radius: 18px;
        font-size: 1rem;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        white-space: nowrap;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        will-change: max-width, background-color, color;
      }
      .chatgptree-prompt-jump-btn .index {
        position: relative;
        min-width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1;
      }
      .chatgptree-prompt-jump-btn .preview {
        padding: 0 16px 0 4px;
        font-size: 0.9rem;
        font-weight: normal;
        opacity: 0;
        transform: translateX(-10px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        white-space: nowrap;
      }
      .chatgptree-prompt-jump-btn:hover .btn-content {
        max-width: 400px;
        background: #6ee7b7;
        color: #23272f;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }
      .chatgptree-prompt-jump-btn:hover .preview {
        opacity: 1;
        transform: translateX(0);
      }
      .chatgptree-prompt-jump-btn.active .btn-content {
        background: #6ee7b7;
        color: #23272f;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }
      /* Tree Visualization Styles */
      .chatgptree-tree-btn {
        position: fixed;
        top: 70px;
        right: 24px;
        z-index: 99999;
        width: 36px;
        height: 36px;
        padding: 0;
        margin: 0;
        border: none;
        background: rgba(35, 39, 47, 0.9);
        color: #6ee7b7;
        border: 2px solid #6ee7b7;
        border-radius: 18px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        outline: none;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }      .chatgptree-tree-btn:hover,
      .chatgptree-tree-btn.active {
        background: #6ee7b7;
        color: #23272f;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }
      
      .chatgptree-tree-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background: rgba(35, 39, 47, 0.9); /* Ensure it doesn't get hover styles */
        color: #6ee7b7;
      }

      .chatgptree-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 99998;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: none;
        align-items: center;
        justify-content: center;
      }
      .chatgptree-overlay.visible {
        display: flex;
      }

      .chatgptree-overlay-title {
        position: absolute;
        top: 25px;
        left: 50%;
        transform: translateX(-50%);
        color: #6ee7b7;
        font-size: 24px;
        font-weight: 600;
        pointer-events: none;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        text-shadow: none; /* FIX: Explicitly remove glow/shadow */
      }

      .chatgptree-close-btn {
        position: absolute;
        top: 20px;
        left: 20px;
        width: 36px;
        height: 36px;
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        line-height: 1;
        padding-bottom: 4px;
        transition: all 0.2s ease;
        z-index: 10;
      }
      .chatgptree-close-btn:hover {
        background: rgba(255, 255, 255, 0.4);
        transform: scale(1.1);
      }
      
      .chatgptree-tree-container {
        position: relative; 
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(8px);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        padding: 24px;
        width: 90vw;
        height: 90vh;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.2);
        cursor: grab;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        touch-action: none;
      }

      .chatgptree-tree-container.grabbing {
        cursor: grabbing;
      }

      .chatgptree-tree {
        width: 100%;
        height: 100%;
        overflow: hidden;
        position: relative;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
      }
      
      .chatgptree-tree svg {
        background: transparent;
        position: absolute;
        transform-origin: 0 0;
      }

      .chatgptree-node {
        position: relative;
        cursor: pointer;
      }

      .chatgptree-node-circle {
        fill: #4299e1;
        stroke: #3182ce;
        stroke-width: 2.5;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
      }

      .chatgptree-node-circle:hover {
        fill: #63b3ed;
        filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15));
        transform: scale(1.02);
      }

      .chatgptree-node-text {
        fill: #1a202c;
        font-size: 14px;
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        pointer-events: none;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
      }

      .chatgptree-node-text-bg {
        opacity: 0.98;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        rx: 6px;
      }

      .chatgptree-node-full-text {
        fill: #1a202c;
        font-size: 14px;
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        pointer-events: none;
        line-height: 1.4;
      }

      .chatgptree-node-full-text-bg {
        stroke: #e2e8f0;
        stroke-width: 1;
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
      }

      .chatgptree-node-connection {
        stroke: #a0aec0;
        stroke-width: 2.5;
        fill: none;
        opacity: 0.8;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.05));
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .chatgptree-node:hover .chatgptree-node-connection {
        stroke: #4a5568;
        opacity: 1;
      }

      @media (max-width: 768px) {
        .chatgptree-prompt-jump-stack {
          right: 12px;
        }
        .chatgptree-prompt-jump-btn,
        .chatgptree-prompt-jump-btn .btn-content {
          min-width: 32px;
          height: 32px;
        }
        .chatgptree-prompt-jump-btn .index {
          min-width: 32px;
          height: 32px;
          font-size: 0.9rem;
        }
        .chatgptree-prompt-jump-btn:hover .btn-content {
          max-width: 300px;
        }
        .chatgptree-tree-btn {
          right: 12px;
          width: 32px;
          height: 32px;
          font-size: 0.9rem;
        }
      }
    `;
    document.head.appendChild(style);
}

  function getPromptPreview(prompt, maxLength = 50) {
    let text = prompt.textContent.trim();
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }
    return text;
  }

  function getUserPrompts() {
    // Updated selectors for better prompt detection - using more reliable and valid selectors
    const selectors = [
      '[data-message-author-role="user"]',
      '.text-base [data-message-author-role="user"]',
      'div.items-start [data-message-author-role="user"]',
      'main [data-message-author-role="user"]'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      console.log(`Trying selector "${selector}":`, elements.length, 'elements found');
      if (elements.length > 0) {
        return Array.from(elements);
      }
    }
    
    console.log('No user prompts found with any selector');
    return [];
  }

  function updateActiveButton(activeIndex) {
    document.querySelectorAll('.chatgptree-prompt-jump-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i === activeIndex);
    });
  }

  function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  function scrollToPrompt(idx) {
    const prompts = getUserPrompts();
    if (prompts[idx]) {
      prompts[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
      updateActiveButton(idx);
    }
  }

  function renderButtons() {
    let stack = document.querySelector('.chatgptree-prompt-jump-stack');
    if (stack) stack.remove();
    
    const prompts = getUserPrompts();
    console.log('Found prompts:', prompts.length);
    
    // Always update tree data even with one prompt
    updateTreeData(prompts);
    
    // Only show buttons for 2+ prompts
    if (prompts.length < 2) {
      console.log('Not enough prompts to show buttons');
      return;
    }

    stack = document.createElement('div');
    stack.className = 'chatgptree-prompt-jump-stack';
    
    // --- FIX: Check if overlay is visible before showing the stack ---
    const overlay = document.querySelector('.chatgptree-overlay');
    if (overlay && overlay.classList.contains('visible')) {
        stack.style.display = 'none';
    }
    
    prompts.forEach((prompt, i) => {
      console.log('Creating button for prompt', i + 1);
      const btn = document.createElement('button');
      btn.className = 'chatgptree-prompt-jump-btn';
      
      const btnContent = document.createElement('div');
      btnContent.className = 'btn-content';
      
      const index = document.createElement('span');
      index.className = 'index';
      index.textContent = (i + 1).toString();
      
      const preview = document.createElement('span');
      preview.className = 'preview';
      preview.textContent = getPromptPreview(prompt, 100);
      
      btnContent.appendChild(index);
      btnContent.appendChild(preview);
      btn.appendChild(btnContent);
      
      btn.onclick = e => {
        e.preventDefault();
        console.log('Clicking button', i + 1);
        scrollToPrompt(i);
      };
      if (isElementInViewport(prompt)) {
        btn.classList.add('active');
      }
      stack.appendChild(btn);
    });
    
    document.body.appendChild(stack);
  }
  function renderTreeButton() {
    let treeBtn = document.querySelector('.chatgptree-tree-btn');
    if (!treeBtn) {
      treeBtn = document.createElement('button');
      treeBtn.className = 'chatgptree-tree-btn';
      treeBtn.textContent = 'T';
      document.body.appendChild(treeBtn);
    }
    
    // Set button state based on whether the chat is trackable
    if (isChatTrackable) {
      treeBtn.disabled = false;
      treeBtn.classList.remove('disabled');
      treeBtn.onclick = toggleTreeOverlay;
      treeBtn.setAttribute('title', 'Show conversation tree');
    } else {
      treeBtn.disabled = true;
      treeBtn.classList.add('disabled');
      treeBtn.onclick = null;
      treeBtn.setAttribute('title', 'Tree view is not available for pre-existing chats');
    }
  }

  function createTreeOverlay() {
    let overlay = document.querySelector('.chatgptree-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'chatgptree-overlay';
      overlay.innerHTML = `
        <span class="chatgptree-overlay-title">Chatgptree</span>
        <button class="chatgptree-close-btn">×</button>
        <div class="chatgptree-tree-container">
          <div class="chatgptree-tree"></div>
        </div>
      `;
      document.body.appendChild(overlay);

      // Attach listener to the new close button
      const closeBtn = overlay.querySelector('.chatgptree-close-btn');
      if (closeBtn) {
          closeBtn.onclick = toggleTreeOverlay;
      }
    }
    return overlay;
  }

  // Add panning functionality
  function initializePanningEvents(container, viewportGroup) {
    console.log('Initializing panning events on viewport group');

    // This function now applies the transform to the <g> element
    function updateTransform() {
      const matrix = `matrix(${viewState.scale}, 0, 0, ${viewState.scale}, ${viewState.x}, ${viewState.y})`;
      viewportGroup.setAttribute('transform', matrix);
    }

    if (!viewState.isInitialized) {
      console.log('Applying your custom default view...');
      
      // These are the exact coordinates 
      viewState.x = -10165.331819457246;
      viewState.y = -548.3256309102353;
      viewState.scale = 6.079802199016465;
      
      viewState.isInitialized = true;
    }

    updateTransform();

    let lastMouseX = 0;
    let lastMouseY = 0;
    let panTicking = false;
    const panSpeed = 5.0; // 1.0 is a 1:1 ratio. 1.5 is 50% faster. 2.0 is 100% faster.

    function startPan(evt) {
      if (evt.button !== 0) return;
      evt.preventDefault();
      container.classList.add('grabbing');
      isPanning = true;
      lastMouseX = evt.clientX;
      lastMouseY = evt.clientY;
      document.addEventListener('mousemove', pan);
      document.addEventListener('mouseup', endPan);
    }

    function pan(evt) {
      if (!isPanning) return;
      evt.preventDefault();
      
      const deltaX = (evt.clientX - lastMouseX) * panSpeed;
      const deltaY = (evt.clientY - lastMouseY) * panSpeed;
      
      lastMouseX = evt.clientX;
      lastMouseY = evt.clientY;
      
      viewState.x += deltaX;
      viewState.y += deltaY;

      if (!panTicking) {
        window.requestAnimationFrame(() => {
          updateTransform();
          panTicking = false;
        });
        panTicking = true;
      }
    }


    function endPan() {
      if (!isPanning) return;
      container.classList.remove('grabbing');
      isPanning = false;
      document.removeEventListener('mousemove', pan);
      document.removeEventListener('mouseup', endPan);
    }

    container.addEventListener('wheel', (evt) => {
      evt.preventDefault();
      const delta = evt.deltaY;
      const scaleChange = delta > 0 ? 0.9 : 1.1;
      const newScale = viewState.scale * scaleChange;
      
      if (newScale >= 0.1 && newScale <= 10) { // Increased max zoom to 10x
        const rect = container.getBoundingClientRect();
        const mouseX = evt.clientX - rect.left;
        const mouseY = evt.clientY - rect.top;
        const svgX = (mouseX - viewState.x) / viewState.scale;
        const svgY = (mouseY - viewState.y) / viewState.scale;
        
        viewState.scale = newScale;
        viewState.x = mouseX - (svgX * newScale);
        viewState.y = mouseY - (svgY * newScale);
        
        updateTransform();
      }
    }, { passive: false });

    container.addEventListener('mousedown', startPan);
    container.style.userSelect = 'none';
  }

  function handleEscapeKey(e) {
    if (e.key === 'Escape') {
      const overlay = document.querySelector('.chatgptree-overlay');
      if (overlay && overlay.classList.contains('visible')) {
        toggleTreeOverlay();
      }
    }
  }


function toggleTreeOverlay() {
    const overlay = document.querySelector('.chatgptree-overlay');
    const treeBtn = document.querySelector('.chatgptree-tree-btn');
    const promptStack = document.querySelector('.chatgptree-prompt-jump-stack');
  
    if (overlay) {
      const isVisible = overlay.classList.toggle('visible');
      
      // --- FIX: Set display style to hide/show UI elements ---
      const displayStyle = isVisible ? 'none' : 'flex';
      if (treeBtn) {
        treeBtn.classList.toggle('active', isVisible);
        treeBtn.style.display = isVisible ? 'none' : 'flex';
      }
      if (promptStack) {
        promptStack.style.display = displayStyle;
      }
  
      if (isVisible) {
        // Add escape key listener ONLY when overlay is opened
        document.addEventListener('keydown', handleEscapeKey);
        updateTreeVisualization();
      } else {
        // Remove escape key listener ONLY when overlay is closed
        document.removeEventListener('keydown', handleEscapeKey);
      }
    }
  }
  
  function setupObservers() {
    // Monitor scroll events to update active button
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const prompts = getUserPrompts();
        prompts.forEach((prompt, i) => {
          if (isElementInViewport(prompt)) {
            updateActiveButton(i);
          }
        });
      }, 100);
    });

    // Monitor regenerate button clicks
    document.addEventListener('click', (e) => {
      const sendBtn = e.target.closest('button.btn.relative.btn-primary');
      if (sendBtn && sendBtn.textContent.includes('Send')) {
        const promptElement = e.target.closest('[data-message-author-role="user"]');
        if (promptElement) {
          const messageId = promptElement.dataset.messageId;
          console.log('Branching from message:', messageId);
          treeData.branchStartId = messageId;
        }
      }
    });

    // Observe chat changes
    const chatRoot = document.querySelector('main');
    if (!chatRoot) {
      console.log('Main element not found, will retry with URL watcher');
      return;
    }
    
    console.log('Setting up observer on main element');
    
    observer = new MutationObserver((mutations) => {
      const hasRelevantChanges = mutations.some(mutation => 
        mutation.addedNodes.length > 0 || 
        mutation.removedNodes.length > 0 ||
        (mutation.type === 'attributes' && mutation.attributeName === 'class')
      );

      if (hasRelevantChanges) {
        console.log('Chat content changed, checking prompts...');
        // Small delay to ensure DOM is settled
        setTimeout(() => {
          const prompts = getUserPrompts();
          // We will update tree data regardless, but only show buttons for 2+
          updateTreeData(prompts);
          renderButtons();
          // If the tree view is open, refresh it with new data
          const overlay = document.querySelector('.chatgptree-overlay');
          if (overlay && overlay.classList.contains('visible')) {
            updateTreeVisualization();
          }
        }, 100);
      }
    });

    observer.observe(chatRoot, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class'] 
    });
  }

  function updateTreeData(prompts) {
    // Update tree data with new prompts
    prompts.forEach((prompt, i) => {
      const messageId = prompt.dataset.messageId;
      if (!treeData.nodes.has(messageId)) {
        const node = {
          messageId,
          text: getPromptPreview(prompt, 20),
          parentId: null,
          children: [],
          x: 0,
          y: 0
        };

        // If this is a branch node
        if (treeData.branchStartId) {
          node.parentId = treeData.branchStartId;
          const parentNode = treeData.nodes.get(treeData.branchStartId);
          if (parentNode) {
            parentNode.children.push(messageId);
            // Clear branch start since we've handled it
            treeData.branchStartId = null;
          }
        } else if (i > 0) {
          // Regular chain - parent is previous prompt
          const prevPrompt = prompts[i - 1];
          const parentId = prevPrompt.dataset.messageId;
          node.parentId = parentId;
          const parentNode = treeData.nodes.get(parentId);
          if (parentNode) {
            parentNode.children.push(messageId);
          }
        }

        treeData.nodes.set(messageId, node);
      }
    });
  }

  function calculateNodePositions() {
    const LEVEL_HEIGHT = 160;    // Vertical distance between levels
    const NODE_WIDTH = 200;      // The conceptual width of a single node
    const SIBLING_GAP = 50;      // The minimum horizontal gap between sibling subtrees
    const START_Y = 150;         // Give it a bit more top margin
    const START_X = 2000;        // Center in our new 4000-width fixed viewBox

    const rootNodeIds = [...treeData.nodes.values()]
      .filter(node => node.parentId === null)
      .map(node => node.messageId);

    if (rootNodeIds.length === 0) {
      console.log("No root node found to start positioning.");
      return;
    }
    const rootNodeId = rootNodeIds[0];

    function calculateSubtreeWidths(nodeId) {
      const node = treeData.nodes.get(nodeId);
      if (!node) return;
      if (node.children.length === 0) {
        node.subtreeWidth = NODE_WIDTH;
        return;
      }
      node.children.forEach(calculateSubtreeWidths);
      let totalChildrenWidth = node.children.reduce((sum, childId) => sum + treeData.nodes.get(childId).subtreeWidth, 0);
      totalChildrenWidth += (node.children.length - 1) * SIBLING_GAP;
      node.subtreeWidth = Math.max(NODE_WIDTH, totalChildrenWidth);
    }

    function positionNodes(nodeId, x, y) {
        const node = treeData.nodes.get(nodeId);
        if (!node) return;
        node.x = x;
        node.y = y;
        if (node.children.length === 0) return;

        let totalChildrenWidth = node.children.reduce((sum, childId) => sum + treeData.nodes.get(childId).subtreeWidth, 0);
        totalChildrenWidth += (node.children.length - 1) * SIBLING_GAP;
        
        let currentX = x - totalChildrenWidth / 2;
        const childY = y + LEVEL_HEIGHT;

        node.children.forEach(childId => {
            const childNode = treeData.nodes.get(childId);
            if(childNode) {
                const childX = currentX + childNode.subtreeWidth / 2;
                positionNodes(childId, childX, childY);
                currentX += childNode.subtreeWidth + SIBLING_GAP;
            }
        });
    }

    calculateSubtreeWidths(rootNodeId);
    positionNodes(rootNodeId, START_X, START_Y);
  }


  function createTreeNode(prompt, x, y, isRoot = false) {
    const NODE_RADIUS = 35; 
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    node.classList.add('chatgptree-node');
    node.setAttribute('transform', `translate(${x}, ${y})`);

    const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    shadow.setAttribute('r', NODE_RADIUS.toString());
    shadow.setAttribute('fill', 'rgba(0,0,0,0.1)');
    shadow.setAttribute('transform', 'translate(3, 3)');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', NODE_RADIUS.toString());
    circle.classList.add('chatgptree-node-circle');

    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    const id = `gradient-${Math.random().toString(36).substr(2, 9)}`;
    gradient.setAttribute('id', id);
    gradient.innerHTML = `
      <stop offset="0%" style="stop-color:#ffffff"/>
      <stop offset="100%" style="stop-color:#90cdf4"/>
    `;
    circle.setAttribute('fill', `url(#${id})`);

    const textBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    textBg.classList.add('chatgptree-node-text-bg');
    textBg.setAttribute('rx', '4');
    textBg.setAttribute('fill', 'rgba(255,255,255,0.95)');

    const MAX_DISPLAY = 11;
    const displayText = prompt.text.length > MAX_DISPLAY ? 
      prompt.text.substring(0, MAX_DISPLAY) + '...' :
      prompt.text;

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.classList.add('chatgptree-node-text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '14px');

    const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    textElement.setAttribute('x', '0');
    textElement.setAttribute('dy', '0.35em');
    textElement.textContent = displayText;
    text.appendChild(textElement);

    textBg.setAttribute('x', '-45');
    textBg.setAttribute('y', '-10');
    textBg.setAttribute('width', '90');
    textBg.setAttribute('height', '20');

    const fullTextBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    fullTextBg.setAttribute('class', 'chatgptree-node-full-text-bg');
    fullTextBg.setAttribute('rx', '4');
    fullTextBg.setAttribute('fill', 'rgba(255,255,255,0.98)');
    fullTextBg.style.display = 'none';

    const fullText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    fullText.setAttribute('class', 'chatgptree-node-full-text');
    fullText.setAttribute('x', '0');
    fullText.setAttribute('text-anchor', 'middle');
    fullText.setAttribute('font-size', '14px');
    
    const HOVER_MAX_LENGTH = 40;
    const words = prompt.text.split(' ');
    let hoverLines = [''];
    let lineIdx = 0;
    words.forEach(word => {
      if ((hoverLines[lineIdx] + ' ' + word).length > HOVER_MAX_LENGTH) {
        lineIdx++;
        hoverLines[lineIdx] = '';
      }
      hoverLines[lineIdx] = (hoverLines[lineIdx] + ' ' + word).trim();
    });

    hoverLines.forEach((line, i) => {
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.setAttribute('x', '0');
      tspan.setAttribute('dy', i === 0 ? '-1.2em' : '1.4em');
      tspan.textContent = line;
      fullText.appendChild(tspan);
    });

    const padding = 12;
    const lineHeight = 20;
    const boxWidth = Math.min(400, Math.max(...hoverLines.map(l => l.length * 8)));
    const boxHeight = hoverLines.length * lineHeight + padding * 2;
    
    fullTextBg.setAttribute('x', -boxWidth/2);
    fullTextBg.setAttribute('y', -(boxHeight/2 + lineHeight/2));
    fullTextBg.setAttribute('width', boxWidth);
    fullTextBg.setAttribute('height', boxHeight);
    
    fullText.style.display = 'none';
    fullTextBg.style.display = 'none';

    const showFullText = () => {
      circle.style.filter = 'brightness(1.1) drop-shadow(0 2px 4px rgba(0,0,0,0.1))';
      text.style.fontWeight = '600';
      fullTextBg.style.display = '';
      fullText.style.display = '';
    };
    
    const hideFullText = () => {
      circle.style.filter = '';
      text.style.fontWeight = '500';
      fullTextBg.style.display = 'none';
      fullText.style.display = 'none';
    };

    node.onmouseover = showFullText;
    node.onmouseout = hideFullText;

    node.appendChild(shadow);
    node.appendChild(circle);
    node.appendChild(gradient);
    node.appendChild(textBg);
    node.appendChild(text);
    node.appendChild(fullTextBg);
    node.appendChild(fullText);

    return node;
  }

  function createConnection(x1, y1, x2, y2) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('chatgptree-node-connection');
    const NODE_RADIUS = 35; 
    const VERTICAL_OFFSET = 50; 
    
    const startX = x1;
    const startY = y1 + NODE_RADIUS;
    const endX = x2;
    const endY = y2 - NODE_RADIUS;
    
    const cp1Y = startY + VERTICAL_OFFSET;
    const cp2Y = endY - VERTICAL_OFFSET;

    const d = `M ${startX} ${startY} C ${startX} ${cp1Y}, ${endX} ${cp2Y}, ${endX} ${endY}`;

    path.setAttribute('d', d);
    return path;
  }

  function updateTreeVisualization() {
    const overlay = document.querySelector('.chatgptree-overlay');
    if (!overlay || !overlay.classList.contains('visible')) return;

    const treeContainer = overlay.querySelector('.chatgptree-tree-container');
    if (!treeContainer) return;

    const treeRoot = treeContainer.querySelector('.chatgptree-tree');
    if (!treeRoot) return;
    treeRoot.innerHTML = '';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 4000 3000');

    const viewportGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    viewportGroup.classList.add('chatgptree-viewport');

    calculateNodePositions();

    treeData.nodes.forEach(node => {
      if (node.parentId) {
        const parent = treeData.nodes.get(node.parentId);
        if (parent) {
          const connection = createConnection(parent.x, parent.y, node.x, node.y);
          viewportGroup.appendChild(connection);
        }
      }
    });

    treeData.nodes.forEach(node => {
      const treeNode = createTreeNode({ text: node.text }, node.x, node.y, false);
      viewportGroup.appendChild(treeNode);
    });

    svg.appendChild(viewportGroup);
    treeRoot.appendChild(svg);

    const newContainer = treeContainer.cloneNode(true);
    treeContainer.replaceWith(newContainer);

    const newViewportGroup = newContainer.querySelector('.chatgptree-viewport');

    if (newViewportGroup) {
        initializePanningEvents(newContainer, newViewportGroup);
    }
  }
  // Start everything
  startUrlWatcher();
  waitForChat();

})();

