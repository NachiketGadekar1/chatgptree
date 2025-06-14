console.log('ChatGPTree content script starting...');

(function addPromptJumpButtons() {
  let currentUrl = '';
  let observer = null;
  let isInitialized = false;
  let initRetryCount = 0;
  let urlCheckInterval = null;
  const MAX_INIT_RETRIES = 10;

  // Flag to identify if a chat is old and has no tree data.
  let isLegacyChatWithoutTree = false;
  
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
    
    if (!mainElement) {
      initRetryCount++;
      setTimeout(waitForChat, 500);
      return;
    }

    console.log('Chat interface detected, initializing...');
    initRetryCount = 0;
    initialize();
  }

  function getChatId() {
    const match = window.location.href.match(/^https:\/\/(chatgpt\.com|chat\.openai\.com)\/c\/([a-zA-Z0-9-]+)/);
    return match ? match[2] : null;
  }

  async function saveTreeToStorage() {
    const chatId = getChatId();
    if (!chatId || isLegacyChatWithoutTree) {
      return;
    }

    const serializableTree = {
      nodes: Object.fromEntries(treeData.nodes),
      branches: Object.fromEntries(treeData.branches),
      activeBranch: treeData.activeBranch,
      branchStartId: treeData.branchStartId,
    };

    try {
      await chrome.storage.local.set({ [`chatgptree-${chatId}`]: serializableTree });
      console.log('ChatGPTree: Tree saved for chat', chatId);
    } catch (error) {
      console.error('ChatGPTree: Error saving tree to storage:', error);
    }
  }

  async function loadTreeFromStorage(chatId) {
    if (!chatId) return null;

    try {
      const data = await chrome.storage.local.get(`chatgptree-${chatId}`);
      const storedTree = data[`chatgptree-${chatId}`];

      if (storedTree && storedTree.nodes && Object.keys(storedTree.nodes).length > 0) {
        treeData.nodes = new Map(Object.entries(storedTree.nodes));
        treeData.branches = new Map(Object.entries(storedTree.branches || {}));
        treeData.activeBranch = storedTree.activeBranch || [];
        treeData.branchStartId = storedTree.branchStartId || null;
        console.log('ChatGPTree: Tree loaded for chat', chatId);
        return true;
      }
    } catch (error) {
      console.error('ChatGPTree: Error loading tree from storage:', error);
    }
    console.log('ChatGPTree: No valid tree found in storage for chat', chatId);
    return null;
  }

// --- CORRECTED INITIALIZE FUNCTION ---
async function initialize() {
  console.log('Checking URL:', window.location.href);
  currentUrl = window.location.href;

  const chatId = getChatId();
  const isSavedChat = !!chatId;
  const isTempChat = !isSavedChat;

  // More robust check for valid pages
  if (!isSavedChat && !currentUrl.startsWith('https://chatgpt.com/')) {
    if (currentUrl !== "https://chatgpt.com/") {
      console.log('Not a recognized chat page, cleaning up. URL:', currentUrl);
      cleanup();
      return;
    }
  }
  console.log(`Page recognized as: ${isSavedChat ? 'Saved Chat' : 'Temporary Chat'}`);

  // Reset state for the new page
  treeData = { nodes: new Map(), branches: new Map(), activeBranch: [], branchStartId: null };
  isLegacyChatWithoutTree = false;

  if (!isInitialized) {
    injectStyles();
    setupObservers();
    startUrlWatcher();
    renderTreeButton();
    createTreeOverlay();
    isInitialized = true;
  }

  const treeLoaded = await loadTreeFromStorage(chatId);

  if (treeLoaded) {
    // CASE 1: Chat with an existing tree. Not legacy.
    isLegacyChatWithoutTree = false;
    console.log('Tree loaded from storage. Initializing UI.');
    renderButtons();
    updateTreeButtonState();
  } else {
    // CASE 2 & 3: No tree in storage. MUST WAIT to see if it's new or legacy.
    console.log('No tree in storage. Waiting 1s to determine chat type...');
    setTimeout(() => {
      // FIX: If the tree has already been populated by the MutationObserver,
      // this check is obsolete and should be ignored.
      if (treeData.nodes.size > 0) {
        console.log('Latent timeout fired, but tree already exists. Ignoring.');
        return;
      }

      const prompts = getUserPrompts();
      if (prompts.length > 0) {
        // It's a legacy chat.
        console.log('Prompts found after wait. This is a legacy chat.');
        isLegacyChatWithoutTree = true;
      } else {
        // It's a new chat.
        console.log('No prompts found after wait. This is a new chat.');
        isLegacyChatWithoutTree = false;
      }
      // After determination, render UI elements with the correct state.
      renderButtons(); 
      updateTreeButtonState();
    }, 1000); // Wait 1 second for the page to stabilize.
  }
}


  function cleanup() {
    console.log('Running cleanup...');
    let stack = document.querySelector('.chatgptree-prompt-jump-stack');
    if (stack) stack.remove();
    let treeBtn = document.querySelector('.chatgptree-tree-btn');
    if (treeBtn) treeBtn.remove();
    let overlay = document.querySelector('.chatgptree-overlay');
    if (overlay) overlay.remove();
    
    console.log('Clearing tree data');
    treeData.nodes.clear();
    treeData.branches.clear();
    treeData.activeBranch = [];
    treeData.branchStartId = null;
    isLegacyChatWithoutTree = false;
    viewState = { x: 0, y: 0, scale: 0.75, isInitialized: false };

    if (observer) {
      console.log('Disconnecting observer');
      observer.disconnect();
      observer = null;
    }
    isInitialized = false;
  }

  function startUrlWatcher() {
    if (urlCheckInterval) clearInterval(urlCheckInterval);
    urlCheckInterval = setInterval(() => {
      if (window.location.href !== currentUrl) {
        console.log('URL changed from:', currentUrl, 'to:', window.location.href);
        cleanup();
        currentUrl = window.location.href;
        initRetryCount = 0;
        waitForChat();
      }
    }, 1000);

    window.addEventListener('unload', () => {
      if (urlCheckInterval) clearInterval(urlCheckInterval);
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
      }
      .chatgptree-tree-btn:hover,
      .chatgptree-tree-btn.active {
        background: #6ee7b7;
        color: #23272f;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }
      .chatgptree-tree-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
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
        text-shadow: none;
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
        display: flex;
        align-items: center;
        justify-content: center;
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
    const selectors = [
      '[data-message-author-role="user"]',
      '.text-base [data-message-author-role="user"]',
      'div.items-start [data-message-author-role="user"]',
      'main [data-message-author-role="user"]'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) return Array.from(elements);
    }
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
    console.log('Rendering buttons, found prompts:', prompts.length);
    
    if (!isLegacyChatWithoutTree) {
      updateTreeData(prompts);
    }
    
    if (prompts.length < 2) return;

    stack = document.createElement('div');
    stack.className = 'chatgptree-prompt-jump-stack';
    
    prompts.forEach((prompt, i) => {
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
      treeBtn.onclick = toggleTreeOverlay;
      document.body.appendChild(treeBtn);
    }
    return treeBtn;
  }

  function updateTreeButtonState() {
    const treeBtn = document.querySelector('.chatgptree-tree-btn');
    if (treeBtn) {
      treeBtn.classList.toggle('disabled', isLegacyChatWithoutTree);
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
      
      overlay.querySelector('.chatgptree-close-btn').onclick = toggleTreeOverlay;
    }
    return overlay;
  }

  function initializePanningEvents(container, viewportGroup) {
    console.log('Initializing panning events on viewport group');

    function updateTransform() {
      const matrix = `matrix(${viewState.scale}, 0, 0, ${viewState.scale}, ${viewState.x}, ${viewState.y})`;
      viewportGroup.setAttribute('transform', matrix);
    }

    if (!viewState.isInitialized) {
      console.log('Applying your custom default view...');
      viewState.x = -10165.331819457246;
      viewState.y = -548.3256309102353;
      viewState.scale = 6.079802199016465;
      viewState.isInitialized = true;
    }

    updateTransform();

    let lastMouseX = 0, lastMouseY = 0, panTicking = false;
    const panSpeed = 5.0;

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
      
      viewState.x += (evt.clientX - lastMouseX) * panSpeed;
      viewState.y += (evt.clientY - lastMouseY) * panSpeed;
      lastMouseX = evt.clientX;
      lastMouseY = evt.clientY;
      
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
      const scaleChange = evt.deltaY > 0 ? 0.9 : 1.1;
      const newScale = viewState.scale * scaleChange;
      
      if (newScale >= 0.1 && newScale <= 10) {
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

  function showLegacyChatMessage() {
    const treeContainer = document.querySelector('.chatgptree-tree-container');
    if (treeContainer) {
        // Clear any existing SVG tree
        treeContainer.innerHTML = '';
        // Add the message
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = 'color: white; text-align: center; font-family: sans-serif; padding: 40px; user-select: text;';
        messageDiv.innerHTML = `
            <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 12px;">Tree Not Available</h2>
            <p style="font-size: 16px; line-height: 1.6; max-width: 450px; margin: 0 auto; opacity: 0.9;">
                ChatGPTree cannot generate a tree for this conversation. Trees are built in real-time for new chats started while the extension is active.
            </p>
        `;
        treeContainer.appendChild(messageDiv);
        // Ensure panning cursor is not shown
        treeContainer.style.cursor = 'default';
    }
  }

  function toggleTreeOverlay() {
      const overlay = document.querySelector('.chatgptree-overlay');
      const treeBtn = document.querySelector('.chatgptree-tree-btn');
      const promptStack = document.querySelector('.chatgptree-prompt-jump-stack');
    
      if (overlay) {
        const isVisible = overlay.classList.toggle('visible');
        const displayStyle = isVisible ? 'none' : 'flex';
        if (treeBtn) {
          treeBtn.classList.toggle('active', isVisible);
          treeBtn.style.display = isVisible ? 'none' : 'flex'; // Hide tree button when overlay is open
        }
        if (promptStack) promptStack.style.display = displayStyle;
    
        if (isVisible) {
          document.addEventListener('keydown', handleEscapeKey);
          if (isLegacyChatWithoutTree) {
            showLegacyChatMessage();
          } else {
            // Ensure the container is ready for the SVG and has a grab cursor
            const treeContainer = overlay.querySelector('.chatgptree-tree-container');
            if (treeContainer && !treeContainer.querySelector('.chatgptree-tree')) {
              treeContainer.innerHTML = '<div class="chatgptree-tree"></div>';
              treeContainer.style.cursor = 'grab'; // Restore grab cursor
            }
            updateTreeVisualization();
          }
        } else {
          document.removeEventListener('keydown', handleEscapeKey);
        }
      }
  }
  
  function setupObservers() {
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const prompts = getUserPrompts();
        let activeIndex = -1; // Track the most visible prompt
        prompts.forEach((prompt, i) => {
            if (isElementInViewport(prompt)) {
                activeIndex = i; // Last one found in viewport will be the active one
            }
        });
        document.querySelectorAll('.chatgptree-prompt-jump-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === activeIndex);
        });
      }, 100);
    });

    document.addEventListener('click', (e) => {
      // Use a more robust selector for the send/regenerate button
      const regenerateBtn = e.target.closest('button[data-testid*="send-button"]');
      if (regenerateBtn) {
        // Find the last user prompt before the send/regenerate action
        const turnElements = Array.from(document.querySelectorAll('[data-message-author-role]'));
        const lastUserPrompt = turnElements.reverse().find(el => el.dataset.messageAuthorRole === 'user');
        if (lastUserPrompt) {
          const messageId = lastUserPrompt.dataset.messageId;
          console.log('Branching from message:', messageId);
          treeData.branchStartId = messageId;
        }
      }
    });

    const chatRoot = document.querySelector('main');
    if (!chatRoot) {
      console.log('Main element not found, will retry with URL watcher');
      return;
    }
    
    console.log('Setting up observer on main element');
    
    observer = new MutationObserver((mutations) => {
      const hasRelevantChanges = mutations.some(mutation => 
        mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0
      );

      if (hasRelevantChanges) {
        console.log('Chat content changed, re-evaluating...');
        setTimeout(() => {
          renderButtons(); // This already calls updateTreeData
          const overlay = document.querySelector('.chatgptree-overlay');
          if (overlay && overlay.classList.contains('visible') && !isLegacyChatWithoutTree) {
            updateTreeVisualization();
          }
        }, 200);
      }
    });

    observer.observe(chatRoot, { childList: true, subtree: true });
  }

  function updateTreeData(prompts) {
    let treeWasModified = false;
    prompts.forEach((prompt, i) => {
      const messageId = prompt.dataset.messageId;
      if (!treeData.nodes.has(messageId)) {
        treeWasModified = true;
        const node = {
          messageId,
          text: getPromptPreview(prompt, 30), // Shortened for node display
          parentId: null,
          children: [],
          x: 0,
          y: 0
        };

        if (treeData.branchStartId) {
          node.parentId = treeData.branchStartId;
          const parentNode = treeData.nodes.get(treeData.branchStartId);
          if (parentNode) {
            // Check if child already exists to avoid duplicates (e.g. from rapid DOM updates)
            if (!parentNode.children.includes(messageId)) {
                parentNode.children.push(messageId);
            }
          }
          treeData.branchStartId = null; // Reset after use
        } else if (i > 0) {
          // If no explicit branch start, assume sequential
          const parentId = prompts[i - 1].dataset.messageId;
          node.parentId = parentId;
          const parentNode = treeData.nodes.get(parentId);
          if (parentNode) {
            // Check if child already exists
            if (!parentNode.children.includes(messageId)) {
                parentNode.children.push(messageId);
            }
          }
        }
        treeData.nodes.set(messageId, node);
      }
    });

    // If the tree data was changed, save it to storage.
    if (treeWasModified) {
      saveTreeToStorage();
    }
  }

  function calculateNodePositions() {
    const LEVEL_HEIGHT = 160, NODE_WIDTH = 200, SIBLING_GAP = 50;
    const START_Y = 150, START_X = 2000; // Arbitrary large X to allow negative offsets

    // Clear subtree widths before recalculating
    treeData.nodes.forEach(node => delete node.subtreeWidth);

    // Identify all nodes that have no parents, or whose parents are not in the current set of nodes.
    // This helps identify true root(s) in case of partially loaded trees or initial state.
    const allNodeIds = new Set(treeData.nodes.keys());
    let potentialRootIds = [...treeData.nodes.values()]
      .filter(node => node.parentId === null || !allNodeIds.has(node.parentId))
      .map(node => node.messageId);
    
    // Sort to ensure consistent root selection if multiple exist, e.g., by oldest message.
    // For simplicity, if multiple roots, just pick the first one by messageId (which might be chronological).
    potentialRootIds.sort();

    if (potentialRootIds.length === 0) return;
    
    // For now, let's assume a single "main" root for layout purposes.
    // In a more complex branching scenario, you might want to handle multiple independent trees.
    const rootNodeId = potentialRootIds[0];

    function calculateSubtreeWidths(nodeId) {
      const node = treeData.nodes.get(nodeId);
      if (!node) return;
      if (node.children.length === 0) {
        node.subtreeWidth = NODE_WIDTH;
        return;
      }
      // Ensure children are processed before calculating parent's width
      node.children.forEach(calculateSubtreeWidths);
      let totalChildrenWidth = node.children.reduce((sum, childId) => {
        const childNode = treeData.nodes.get(childId);
        return sum + (childNode ? childNode.subtreeWidth : 0);
      }, 0);
      totalChildrenWidth += (node.children.length - 1) * SIBLING_GAP;
      node.subtreeWidth = Math.max(NODE_WIDTH, totalChildrenWidth);
    }

    function positionNodes(nodeId, x, y) {
        const node = treeData.nodes.get(nodeId);
        if (!node) return;
        node.x = x;
        node.y = y;
        if (node.children.length === 0) return;

        let totalChildrenWidth = node.children.reduce((sum, childId) => {
            const childNode = treeData.nodes.get(childId);
            return sum + (childNode ? childNode.subtreeWidth : 0);
        }, 0);
        totalChildrenWidth += (node.children.length - 1) * SIBLING_GAP;
        
        let currentX = x - totalChildrenWidth / 2;
        const childY = y + LEVEL_HEIGHT;

        // Sort children by messageId to ensure consistent horizontal positioning
        const sortedChildren = [...node.children].sort(); 

        sortedChildren.forEach(childId => {
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

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', NODE_RADIUS.toString());
    circle.classList.add('chatgptree-node-circle');

    // This gradient declaration will be problematic if not in defs and duplicated for every node.
    // However, the `updateTreeVisualization` function correctly moves it to `defs`.
    // So, here we'll just prepare the circle to use a gradient by ID.
    // The actual gradient elements will be created in `updateTreeVisualization`.
    circle.setAttribute('fill', `url(#gradient-${prompt.messageId})`); // Reference by ID

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
    let hoverLines = [''], lineIdx = 0;
    words.forEach(word => {
      if (hoverLines[lineIdx].length + word.length + 1 > HOVER_MAX_LENGTH && hoverLines[lineIdx].length > 0) {
        lineIdx++;
        hoverLines[lineIdx] = word;
      } else {
        hoverLines[lineIdx] = (hoverLines[lineIdx] + ' ' + word).trim();
      }
    });

    hoverLines.forEach((line, i) => {
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.setAttribute('x', '0');
      const initialDy = -(hoverLines.length - 1) * 0.7; 
      tspan.setAttribute('dy', i === 0 ? `${initialDy}em` : '1.4em');
      tspan.textContent = line;
      fullText.appendChild(tspan);
    });

    const padding = 12, lineHeight = 20;
    const boxWidth = Math.min(400, Math.max(100, ...hoverLines.map(l => l.length * 8)) + padding * 2);
    const boxHeight = hoverLines.length * lineHeight + padding * 2;
    
    fullTextBg.setAttribute('x', -boxWidth/2);
    fullTextBg.setAttribute('y', -(boxHeight/2));
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

    node.appendChild(circle);
    // Do NOT append gradient here, it should be in <defs>
    
    node.appendChild(textBg);
    node.appendChild(text);
    node.appendChild(fullTextBg);
    node.appendChild(fullText);

    return node;
  }

  function createConnection(x1, y1, x2, y2) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('chatgptree-node-connection');
    const NODE_RADIUS = 35, VERTICAL_OFFSET = 50; 
    
    const startX = x1, startY = y1 + NODE_RADIUS;
    const endX = x2, endY = y2 - NODE_RADIUS;
    const cp1Y = startY + VERTICAL_OFFSET, cp2Y = endY - VERTICAL_OFFSET;

    const d = `M ${startX} ${startY} C ${startX} ${cp1Y}, ${endX} ${cp2Y}, ${endX} ${endY}`;

    path.setAttribute('d', d);
    return path;
  }

  function updateTreeVisualization() {
    const overlay = document.querySelector('.chatgptree-overlay');
    if (!overlay || !overlay.classList.contains('visible')) return;

    const treeContainer = overlay.querySelector('.chatgptree-tree-container');
    if (!treeContainer) return;

    let finalTreeRoot = treeContainer.querySelector('.chatgptree-tree');
    if (!finalTreeRoot) {
        treeContainer.innerHTML = '<div class="chatgptree-tree"></div>';
        finalTreeRoot = treeContainer.querySelector('.chatgptree-tree');
        treeContainer.style.cursor = 'grab'; 
    }
    if (!finalTreeRoot) return; 

    finalTreeRoot.innerHTML = ''; // Clear previous SVG content

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 4000 3000'); 

    const viewportGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    viewportGroup.classList.add('chatgptree-viewport');

    calculateNodePositions();

    // Append gradients to defs
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    treeData.nodes.forEach(node => {
        const gradientId = `gradient-${node.messageId}`; // Unique ID for each node's gradient
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
        gradient.setAttribute('id', gradientId);
        gradient.innerHTML = `
          <stop offset="0%" style="stop-color:#ffffff"/>
          <stop offset="100%" style="stop-color:#90cdf4"/>
        `;
        defs.appendChild(gradient);
    });
    svg.appendChild(defs);


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
      const treeNode = createTreeNode({ text: node.text, messageId: node.messageId }, node.x, node.y, false);
      viewportGroup.appendChild(treeNode);
    });

    svg.appendChild(viewportGroup);
    finalTreeRoot.appendChild(svg);

    initializePanningEvents(treeContainer, viewportGroup);
  }
  
  // Start everything
  startUrlWatcher();
  waitForChat();
})();