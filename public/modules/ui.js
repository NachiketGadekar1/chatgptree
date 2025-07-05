/**
 * Displays a temporary toast notification on the screen.
 * @param {string} message The message to display.
 * @param {number} [duration=5000] The time in ms for the toast to be visible.
 * @param {'info' | 'error'} [type='error'] The type of toast for styling.
 */
function showToast(message, duration = 5000, type = 'error') {
  const existingToast = document.querySelector('.chatgptree-toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'chatgptree-toast-notification';
  toast.classList.add(type);
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('visible');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, duration);
}

/**
 * Injects the required CSS styles into the page's head.
 */
function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .chatgptree-toast-notification {
        position: fixed; bottom: 24px; left: 50%; z-index: 100000; color: #ffffff; border-radius: 12px;
        padding: 12px 20px; font-size: 0.95rem; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        max-width: 450px; text-align: center; pointer-events: none; opacity: 0;
        transform: translate(-50%, 40px);
        transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .chatgptree-toast-notification.info { background: rgba(52, 53, 65, 0.95); border: 2px solid #6ee7b7; }
      .chatgptree-toast-notification.error { background: rgba(239, 68, 68, 0.95); border: 2px solid #f87171; }
      .chatgptree-toast-notification.visible { opacity: 1; transform: translate(-50%, 0); }
      @keyframes chatgptree-glow-fade {
        0% { box-shadow: 0 0 16px 6px rgba(110, 231, 183, 0.6); opacity: 1; }
        100% { box-shadow: 0 0 0 0 rgba(110, 231, 183, 0); opacity: 0; }
      }
      .chatgptree-bubble-highlight { position: relative !important; z-index: 1 !important; }
      .chatgptree-bubble-highlight::before {
        content: '' !important; position: absolute !important; top: 0 !important; left: 0 !important;
        right: 0 !important; bottom: 0 !important; border-radius: inherit !important; z-index: -1 !important;
        pointer-events: none !important; animation: chatgptree-glow-fade 2.5s ease-out forwards !important;
      }
      .chatgptree-prompt-jump-stack {
        position: fixed; top: 120px; right: 24px; z-index: 99999; display: flex;
        flex-direction: column; gap: 12px; pointer-events: none;
      }
      .chatgptree-prompt-jump-btn {
        position: relative; width: 36px; height: 36px; padding: 0; margin: 0; border: none;
        background: none; cursor: pointer; outline: none; pointer-events: auto;
      }
      .chatgptree-prompt-jump-btn .btn-content {
        position: absolute; top: 0; right: 0; height: 36px; min-width: 36px; max-width: 36px;
        display: flex; align-items: center; background: rgba(35, 39, 47, 0.9); color: #6ee7b7;
        border: 2px solid #6ee7b7; border-radius: 18px; font-size: 1rem; font-weight: 600;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15); white-space: nowrap; overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); will-change: max-width, background-color, color;
      }
      .chatgptree-prompt-jump-btn .index {
        min-width: 36px; height: 36px; display: flex; align-items: center;
        justify-content: center; z-index: 1; line-height: 1;
        position: relative;
        left: -1px; /* Adjust this value. Negative moves left, positive moves right. */
      }
      .chatgptree-prompt-jump-btn .preview {
        padding: 0 16px 0 4px; font-size: 0.9rem; font-weight: normal; opacity: 0;
        transform: translateX(-10px); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); white-space: nowrap;
      }
      .chatgptree-prompt-jump-btn:hover .btn-content {
        max-width: 400px; background: #6ee7b7; color: #23272f; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }
      .chatgptree-prompt-jump-btn:hover .preview { opacity: 1; transform: translateX(0); }
      .chatgptree-tree-btn {
        position: fixed; top: 70px; right: 24px; z-index: 99999;
        height: 36px;
        padding: 0 12px;
        gap: 6px;
        margin: 0; border: none; background: rgba(35, 39, 47, 0.9); color: #6ee7b7;
        border: 2px solid #6ee7b7; border-radius: 18px; font-size: 0.9rem; font-weight: 600;
        cursor: pointer; outline: none; display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        white-space: nowrap;
      }
      .chatgptree-tree-btn:hover, .chatgptree-tree-btn.active { background: #6ee7b7; color: #23272f; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
      .chatgptree-tree-btn.disabled {
        opacity: 0.5; cursor: not-allowed; background: rgba(35, 39, 47, 0.9); color: #6ee7b7;
      }
      .chatgptree-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 99998;
        background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); display: none;
        align-items: center; justify-content: center;
      }
      .chatgptree-overlay.visible { display: flex; }
      .chatgptree-overlay-title {
        position: absolute; top: 50px; left: 50%; transform: translateX(-50%); color: #6ee7b7;
        font-size: 24px; font-weight: 600; pointer-events: none; user-select: none;
        -webkit-user-select: none; -moz-user-select: none; text-shadow: none;
      }
      .chatgptree-close-btn {
        position: absolute; top: 20px; left: 20px; width: 36px; height: 36px;
        background: rgba(255, 255, 255, 0.2); color: #fff; border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;
        font-size: 28px; line-height: 1; padding-bottom: 4px; transition: all 0.2s ease; z-index: 10;
      }
      .chatgptree-close-btn:hover { background: rgba(255, 255, 255, 0.4); transform: scale(1.1); }
      .chatgptree-tree-container {
        position: relative; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(8px);
        border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); padding: 24px;
        width: 90vw; height: 90vh; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.2);
        cursor: grab; user-select: none; -webkit-user-select: none; -moz-user-select: none;
        -ms-user-select: none; touch-action: none;
      }
      .chatgptree-tree-container.grabbing { cursor: grabbing; }
      @media (max-width: 768px) {
        .chatgptree-prompt-jump-stack { right: 12px; }
        .chatgptree-prompt-jump-btn, .chatgptree-prompt-jump-btn .btn-content { min-width: 32px; height: 32px; }
        .chatgptree-prompt-jump-btn .index { min-width: 32px; height: 32px; font-size: 0.9rem; line-height: 1; }
        .chatgptree-prompt-jump-btn:hover .btn-content { max-width: 300px; }
        .chatgptree-tree-btn { right: 12px; height: 32px; font-size: 0.85rem; padding: 0 10px; }
      }
      
      .chatgptree-runner-container {
        display: flex;
        justify-content: flex-start;
        margin-top: 12px;
        margin-bottom: 16px;
      }
      .chatgptree-render-btn {
        display: inline-flex;
        align-items: center;
        height: 36px;
        padding: 0 16px;
        background: rgba(35, 39, 47, 0.9);
        color: #6ee7b7;
        border: 2px solid #6ee7b7;
        border-radius: 18px; /* Pill shape */
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .chatgptree-render-btn:hover {
        background: #6ee7b7;
        color: #23272f;
        border-color: #6ee7b7;
      }
      .chatgptree-output-container {
        width: 100%;
        margin-bottom: 12px;
      }
      .chatgptree-output-iframe {
        width: 100%;
        height: 600px;
        background-color: #fff;
        border: 2px solid #6ee7b7;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      
       /* --- START: VISUAL REFRESH FOR COMPOSER --- */
      .chatgptree-expand-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        padding: 0;
        margin-right: 8px;
        background: rgba(35, 39, 47, 0.9);
        color: #6ee7b7;
        border: 2px solid #6ee7b7;
        border-radius: 18px; /* Pill shape */
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .chatgptree-expand-btn:hover {
        background: #6ee7b7;
        color: #23272f;
      }
      .chatgptree-expand-btn svg {
        width: 20px;
        height: 20px;
      }
      .chatgptree-composer-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 99998;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: none;
        align-items: center;
        justify-content: center;
      }
      .chatgptree-composer-overlay.visible {
        display: flex;
      }
      .chatgptree-composer-container {
        width: 90vw;
        max-width: 1200px;
        height: 85vh;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        position: relative;
      }
      .chatgptree-composer-title {
        color: #6ee7b7;
        font-size: 20px;
        font-weight: 600;
        margin: 0;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      /* FIX: Use the ID selector '#' instead of the class selector '.' */
      #chatgptree-composer-textarea {
        flex-grow: 1;
        width: 100%;
        background: rgba(0, 0, 0, 0.3);
        color: #f9fafb; /* Bright white text for high contrast */
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 16px;
        font-size: 1.1rem;
        font-family: inherit;
        line-height: 1.6;
        resize: none;
        outline: none;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
        transition: border-color 0.2s, background-color 0.2s;
      }
      #chatgptree-composer-textarea:focus {
        border-color: #6ee7b7;
        background: rgba(0, 0, 0, 0.4);
      }
      #chatgptree-composer-textarea::placeholder {
        color: #9ca3af;
      }
      #chatgptree-composer-send-btn {
        align-self: flex-end;
        padding: 10px 24px;
        border: none;
        background-color: #6ee7b7;
        color: #23272f;
        font-size: 1rem;
        font-weight: 600;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.2s, transform 0.1s;
      }
      #chatgptree-composer-send-btn:hover {
        background-color: #34d399;
      }
      #chatgptree-composer-send-btn:active {
        transform: scale(0.98);
      }
      .chatgptree-composer-close-btn {
        position: absolute; top: 16px; right: 16px; width: 32px; height: 32px;
        background: rgba(255, 255, 255, 0.1); color: #fff; border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;
        font-size: 24px; line-height: 1; padding-bottom: 2px; transition: all 0.2s ease;
      }
      .chatgptree-composer-close-btn:hover { background: rgba(255, 255, 255, 0.3); transform: scale(1.1); }
      /* --- END: VISUAL REFRESH FOR COMPOSER --- */
    `;
    document.head.appendChild(style);
}


/**
 * Finds all user prompts on the page using a series of selectors.
 * @returns {Array<HTMLElement>} An array of user prompt elements.
 */
function getUserPrompts() {
  const selectors = [
    '[data-message-author-role="user"]',
    '.text-base [data-message-author-role="user"]',
    'div.items-start [data-message-author-role="user"]',
    'main [data-message-author-role="user"]'
  ];
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      return Array.from(elements);
    }
  }
  return [];
}

/**
 * Renders the floating jump-to-prompt buttons on the side of the screen.
 */
function renderButtons() {
  let stack = document.querySelector('.chatgptree-prompt-jump-stack');
  if (stack) stack.remove();

  const prompts = getUserPrompts();
  updateTreeData(prompts);

  if (prompts.length < 2) {
    return;
  }

  stack = document.createElement('div');
  stack.className = 'chatgptree-prompt-jump-stack';

  const overlay = document.querySelector('.chatgptree-overlay');
  if (overlay && overlay.classList.contains('visible')) {
      stack.style.display = 'none';
  }

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
      const promptId = prompt.dataset.messageId;
      if (promptId) {
          scrollToPromptById(promptId, true);
      }
    };

    // REMOVED logic that added the .active class
    stack.appendChild(btn);
  });

  document.body.appendChild(stack);
}

/**
 * Scrolls the page to the prompt with the given messageId and highlights it.
 * @param {string} messageId The messageId of the prompt to scroll to.
 * @param {boolean} [isFinalDestination=false] If true, applies a temporary highlight.
 * @returns {boolean} True if the scroll was successful, false otherwise.
 */
function scrollToPromptById(messageId, isFinalDestination = false) {
  const targetMessageDiv = document.querySelector(`div[data-message-id="${messageId}"]`);
  if (!targetMessageDiv) {
      console.error(`[scrollToPromptById] DOM Failure: Could not find prompt container element with ID: ${messageId}`);
      return false;
  }

  if (isFinalDestination) {
      // Find the specific message bubble inside the container, which has a background color class.
      // Fall back to the main message container if the bubble isn't found.
      const elementToHighlight = targetMessageDiv.querySelector('div.bg-token-message-surface') || targetMessageDiv;

      elementToHighlight.classList.remove('chatgptree-bubble-highlight');
      void elementToHighlight.offsetWidth; // Force reflow to restart animation
      elementToHighlight.classList.add('chatgptree-bubble-highlight');
  }

  targetMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // REMOVED call to updateActiveButton()
  return true;
}

/**
 * Renders the main 'Tree' button to open the tree view.
 */
function renderTreeButton() {
  let treeBtn = document.querySelector('.chatgptree-tree-btn');
  if (!treeBtn) {
    treeBtn = document.createElement('button');
    treeBtn.className = 'chatgptree-tree-btn';
    treeBtn.textContent = '🌳 Tree';
    document.body.appendChild(treeBtn);
  }

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

/**
 * Replaces the default "Edit" pencil icon with our "Root" or "Branch" button.
 */
function replaceEditMessageButtons() {
    // Style constants for the enabled button, to match jump buttons' theme
    const enabledDefaultBg = 'rgba(35, 39, 47, 0.9)';
    const enabledDefaultColor = '#6ee7b7';
    const enabledDefaultBorder = '2px solid #6ee7b7';
    const enabledHoverBg = '#6ee7b7';
    const enabledHoverColor = '#23272f';

    // Style constants for the disabled "Root" button
    const disabledBackgroundColor = '#d1d5db';
    const disabledTextColor = '#6b7280';

    const editButtons = document.querySelectorAll('button[aria-label="Edit message"]:not([data-chatgptree-modified])');

    editButtons.forEach((button) => {
        button.setAttribute('data-chatgptree-modified', 'true');
        button.classList.remove('hover:bg-token-bg-secondary');
        button.style.borderRadius = '18px'; // Set a consistent pill shape

        const innerSpan = button.querySelector('span');
        if (!innerSpan) return; // Skip if the button structure is unexpected

        // Apply common styling to the inner span for consistent text display
        innerSpan.classList.remove('w-8', 'justify-center');
        innerSpan.classList.add('w-auto', 'px-3', 'gap-2');
        innerSpan.style.fontSize = '14px';
        innerSpan.style.fontWeight = '500';
        innerSpan.style.whiteSpace = 'nowrap';
        
        // Add smooth transitions for hover effects
        button.style.transition = 'background-color 0.2s ease, border-color 0.2s ease';
        innerSpan.style.transition = 'color 0.2s ease';

        if (!hasCreatedRootButton) {
            // Style the very first prompt's button as a disabled "Root Message"
            button.setAttribute('title', 'Cannot create a branch from the root message.');
            button.setAttribute('aria-label', 'Root message, cannot create a branch.');
            button.style.backgroundColor = disabledBackgroundColor;
            button.style.border = 'none';
            button.style.opacity = '0.7';
            button.style.cursor = 'not-allowed';
            button.style.pointerEvents = 'none';

            innerSpan.style.color = disabledTextColor;
            innerSpan.innerHTML = '🪵 Root Message';
            hasCreatedRootButton = true;
        } else {
            // Style all subsequent buttons as active "Create a branch here" buttons
            button.removeAttribute('title'); // <-- TOOLTIP REMOVED
            button.setAttribute('aria-label', 'Create a branch here');

            // Set initial style to match the jump buttons' default (dark) state
            button.style.backgroundColor = enabledDefaultBg;
            button.style.border = enabledDefaultBorder;
            innerSpan.style.color = enabledDefaultColor;
            innerSpan.innerHTML = '🪵 Create a branch here';

            // Add hover effects to match the jump buttons' hover (light) state
            button.addEventListener('mouseover', () => {
                button.style.backgroundColor = enabledHoverBg;
                innerSpan.style.color = enabledHoverColor;
            });
            button.addEventListener('mouseout', () => {
                button.style.backgroundColor = enabledDefaultBg;
                innerSpan.style.color = enabledDefaultColor;
            });
        }
    });
}

/**
 * Creates the main overlay element for the tree view if it doesn't exist.
 * @returns {HTMLElement} The overlay element.
 */
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

    const closeBtn = overlay.querySelector('.chatgptree-close-btn');
    if (closeBtn) {
        closeBtn.onclick = toggleTreeOverlay;
    }
  }
  return overlay;
}

/**
 * Toggles the visibility of the tree view overlay.
 */
function toggleTreeOverlay() {
  const overlay = document.querySelector('.chatgptree-overlay');
  const treeBtn = document.querySelector('.chatgptree-tree-btn');
  const promptStack = document.querySelector('.chatgptree-prompt-jump-stack');

  if (overlay) {
    const isVisible = overlay.classList.toggle('visible');
    const displayStyle = isVisible ? 'none' : 'flex';
    if (treeBtn) {
      treeBtn.classList.toggle('active', isVisible);
      treeBtn.style.display = isVisible ? 'none' : 'flex';
    }
    if (promptStack) {
      promptStack.style.display = displayStyle;
    }

    if (isVisible) {
      document.addEventListener('keydown', handleEscapeKey);
      updateTreeVisualization();
    } else {
      document.removeEventListener('keydown', handleEscapeKey);
    }
  }
}

/**
 * Handles the 'Escape' key to close the tree view overlay.
 * @param {KeyboardEvent} e - The keyboard event.
 */
function handleEscapeKey(e) {
  if (e.key === 'Escape') {
    const overlay = document.querySelector('.chatgptree-overlay');
    if (overlay && overlay.classList.contains('visible')) {
      toggleTreeOverlay();
    }
  }
}

const EXPAND_ICON_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
const COLLAPSE_ICON_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>`;

/**
 * Renders the button that opens the composer overlay.
 * It's idempotent, only creating the button if it doesn't exist.
 * @returns {boolean} - True if the container was found, false otherwise.
 */
function renderExpandComposerButton() {
    const actionsContainer = document.querySelector('[data-testid="composer-footer-actions"]');
    if (!actionsContainer) {
        return false; // Container not found, report failure.
    }
    
    if (actionsContainer.querySelector('.chatgptree-expand-btn')) {
        return true; // Button already exists, report success.
    }

    const expandButton = document.createElement('button');
    expandButton.type = 'button';
    // FIX: Use only our custom class to avoid inheriting unwanted styles
    expandButton.className = 'chatgptree-expand-btn'; 
    expandButton.innerHTML = EXPAND_ICON_SVG;
    expandButton.setAttribute('aria-label', 'Expand composer');
    expandButton.setAttribute('title', 'Expand Composer'); // Add a tooltip
    
    expandButton.onclick = toggleComposerOverlay;

    actionsContainer.prepend(expandButton);
    return true; // Button was successfully added, report success.
}


/**
 * Creates the composer overlay and attaches its event listeners.
 * This should only be called once during initialization.
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
    const closeBtn = overlay.querySelector('.chatgptree-composer-close-btn');
    const textarea = overlay.querySelector('#chatgptree-composer-textarea');

    if (sendBtn) sendBtn.onclick = handleSendFromOverlay;
    if (closeBtn) closeBtn.onclick = toggleComposerOverlay;
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
 * Toggles the visibility of the composer overlay.
 */
function toggleComposerOverlay() {
    const overlay = document.querySelector('.chatgptree-composer-overlay');
    const textarea = overlay ? overlay.querySelector('#chatgptree-composer-textarea') : null;
    if (!overlay || !textarea) return;

    const isVisible = overlay.classList.toggle('visible');

    if (isVisible) {
        console.log('[ChatGPTree] Composer overlay opened.');
        textarea.focus(); // Auto-focus the textarea for immediate typing
        document.addEventListener('keydown', handleComposerEscapeKey);
    } else {
        console.log('[ChatGPTree] Composer overlay closed.');
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
 * Pastes text from our overlay into the real chatbox and clicks send.
 * This version correctly handles the dynamic appearance of the send button.
 */
function handleSendFromOverlay() {
    console.log('[ChatGPTree] Attempting to send from overlay...');
    const sourceTextarea = document.getElementById('chatgptree-composer-textarea');
    const targetInput = document.querySelector('div#prompt-textarea[contenteditable="true"]');

    if (!sourceTextarea || !targetInput) {
        console.error('[ChatGPTree] FAILED: Could not find our textarea or the target input div.');
        showToast('Error: ChatGPT input not found.', 5000, 'error');
        return;
    }
    
    const textToSend = sourceTextarea.value;
    if (!textToSend.trim()) {
        console.log('[ChatGPTree] No text to send.');
        return;
    }

    // Step 1: Set the innerHTML of the div to our text.
    targetInput.innerHTML = `<p>${textToSend.replace(/\n/g, '<br>')}</p>`;
    
    // Step 2: Dispatch an 'input' event. This is what tells React to update the UI.
    targetInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    console.log('[ChatGPTree] Injected text and dispatched event. Waiting for UI to update...');
    
    // Step 3: Wait for React to re-render and show the send button.
    setTimeout(() => {
        // Step 4: NOW, find the send button. It should exist.
        const realSendButton = document.querySelector('[data-testid="send-button"]');

        if (realSendButton) {
            console.log('[ChatGPTree] Found the send button after a delay.');
            realSendButton.click();
            console.log('[ChatGPTree] Sent message to ChatGPT.');

            // Step 5: Clean up
            sourceTextarea.value = '';
            toggleComposerOverlay();
        } else {
            console.error('[ChatGPTree] FAILED: Send button did not appear after text injection and delay.');
            showToast('Error: Could not activate ChatGPT send button.', 5000, 'error');
        }
    }, 100); // A 100ms delay is usually more than enough.
}