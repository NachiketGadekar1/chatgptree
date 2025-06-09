// Placeholder for content script logic.
// You can inject UI or interact with the ChatGPT page here.

console.log('ChatGPTree content script starting...');

(function addPromptJumpButtons() {
  let currentUrl = '';
  let observer = null;
  let isInitialized = false;
  let initRetryCount = 0;
  let urlCheckInterval = null;
  const MAX_INIT_RETRIES = 10;

  function waitForChat() {
    if (initRetryCount >= MAX_INIT_RETRIES) {
      console.log('Max retries reached for current attempt');
      initRetryCount = 0;
      // Don't give up entirely - keep watching for URL changes
      return;
    }

    console.log('Attempting initialization, attempt:', initRetryCount + 1);
    const mainElement = document.querySelector('main');
    
    if (!mainElement || !document.querySelector('[data-message-author-role="user"]')) {
      initRetryCount++;
      setTimeout(waitForChat, 500);
      return;
    }

    console.log('Chat interface detected, initializing...');
    initRetryCount = 0;
    initialize();
  }

  function initialize() {
    console.log('Checking URL:', window.location.href);
    currentUrl = window.location.href;
    
    // Only run on chat pages
    if (!/^https:\/\/(chatgpt\.com|chat\.openai\.com)\/c\//.test(currentUrl)) {
      console.log('Not a chat page, cleaning up');
      cleanup();
      return;
    }

    if (!isInitialized) {
      injectStyles();
      setupObservers();
      startUrlWatcher();
      renderTreeButton();
      createTreeOverlay();
      isInitialized = true;
    }

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
    }

    // Watch for URL changes persistently
    urlCheckInterval = setInterval(() => {
      const newUrl = window.location.href;
      if (newUrl !== currentUrl) {
        console.log('URL changed from:', currentUrl);
        console.log('URL changed to:', newUrl);
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
      }
      .chatgptree-tree-btn:hover,
      .chatgptree-tree-btn.active {
        background: #6ee7b7;
        color: #23272f;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
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
      
      .chatgptree-tree-container {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(8px);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        padding: 24px;
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .chatgptree-tree {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      .chatgptree-tree svg {
        background: transparent;
      }

      .chatgptree-node {
        position: relative;
      }

      .chatgptree-node-circle {
        fill: #4299e1;
        stroke: #2b6cb0;
        stroke-width: 2;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .chatgptree-node-circle:hover {
        fill: #63b3ed;
      }

      .chatgptree-node-text {
        fill: #2d3748;
        font-size: 14px;
        font-weight: 500;
        pointer-events: none;
      }

      .chatgptree-node-connection {
        stroke: #a0aec0;
        stroke-width: 2;
        fill: none;
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
    
    if (prompts.length < 2) {
      console.log('Not enough prompts to show buttons');
      return;
    }

    stack = document.createElement('div');
    stack.className = 'chatgptree-prompt-jump-stack';
    
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
      treeBtn.onclick = toggleTreeOverlay;
      document.body.appendChild(treeBtn);
    }
    return treeBtn;
  }

  function createTreeOverlay() {
    let overlay = document.querySelector('.chatgptree-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'chatgptree-overlay';
      overlay.innerHTML = `
        <div class="chatgptree-tree-container">
          <div class="chatgptree-tree"></div>
        </div>
      `;
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          toggleTreeOverlay();
        }
      };
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function toggleTreeOverlay() {
    const overlay = document.querySelector('.chatgptree-overlay');
    const treeBtn = document.querySelector('.chatgptree-tree-btn');
    if (overlay) {
      const isVisible = overlay.classList.toggle('visible');
      treeBtn.classList.toggle('active', isVisible);
      if (isVisible) {
        updateTreeVisualization();
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
          if (prompts.length >= 2) {
            console.log('Found enough prompts, rendering buttons');
            renderButtons();
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

  function createTreeNode(prompt, x, y, isRoot = false) {
    const NODE_RADIUS = 25;
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    node.classList.add('chatgptree-node');
    node.setAttribute('transform', `translate(${x}, ${y})`);

    // Shadow
    const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    shadow.setAttribute('r', NODE_RADIUS.toString());
    shadow.setAttribute('fill', 'rgba(0,0,0,0.1)');
    shadow.setAttribute('transform', 'translate(3, 3)');

    // Main circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', NODE_RADIUS.toString());
    circle.classList.add('chatgptree-node-circle');

    // Gradient
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    const id = `gradient-${Math.random().toString(36).substr(2, 9)}`;
    gradient.setAttribute('id', id);
    gradient.innerHTML = `
      <stop offset="0%" style="stop-color:#ffffff"/>
      <stop offset="100%" style="stop-color:#90cdf4"/>
    `;
    circle.setAttribute('fill', `url(#${id})`);

    // Text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.classList.add('chatgptree-node-text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dy', '0.3em');
    text.textContent = isRoot ? 'Root' : getPromptPreview(prompt, 20);

    node.appendChild(shadow);
    node.appendChild(circle);
    node.appendChild(gradient);
    node.appendChild(text);
    
    return node;
  }

  function createConnection(x1, y1, x2, y2) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('chatgptree-node-connection');
    const NODE_RADIUS = 25;
    const VERTICAL_SPACING = 120;
    
    path.setAttribute('d', `M ${x1} ${y1 + NODE_RADIUS} 
                          C ${x1} ${y1 + VERTICAL_SPACING/2},
                            ${x2} ${y2 - VERTICAL_SPACING/2},
                            ${x2} ${y2 - NODE_RADIUS}`);
    return path;
  }

  function updateTreeVisualization() {
    const overlay = document.querySelector('.chatgptree-overlay');
    if (!overlay || !overlay.classList.contains('visible')) return;

    const treeContainer = overlay.querySelector('.chatgptree-tree');
    if (!treeContainer) return;

    const prompts = getUserPrompts();
    if (prompts.length === 0) return;

    // Clear existing tree
    treeContainer.innerHTML = '';

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.minWidth = '600px';
    svg.style.minHeight = '400px';

    // Calculate tree dimensions
    const NODE_SPACING = 150;
    const LEVEL_HEIGHT = 120;
    const width = Math.max(600, NODE_SPACING * prompts.length);
    const height = Math.max(400, LEVEL_HEIGHT * 4);
    
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Create root node at top center
    const rootX = width / 2;
    const rootY = 50;
    const rootNode = createTreeNode(null, rootX, rootY, true);
    svg.appendChild(rootNode);

    // Position prompt nodes in a tree layout
    prompts.forEach((prompt, i) => {
      const x = (i + 1) * NODE_SPACING;
      const y = rootY + LEVEL_HEIGHT;
      
      const node = createTreeNode(prompt, x, y);
      const connection = createConnection(rootX, rootY, x, y);
      
      svg.appendChild(connection);
      svg.appendChild(node);
    });

    treeContainer.appendChild(svg);
  }

  // Start everything
  startUrlWatcher();
  waitForChat();
})();
