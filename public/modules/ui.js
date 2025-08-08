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

const STAR_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;

/**
 * Injects the required CSS styles into the page's head.
 */
function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* --- REVISED: Bookmark Button --- */
      .chatgptree-bookmark-btn {
        background: none;
        border: none;
        padding: 0;
        margin: 0 4px 0 8px;
        cursor: pointer;
        color: #8e8ea0; /* Default empty star color */
        transition: color 0.2s ease, transform 0.2s ease, opacity 0.15s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        
        /* By default, star is invisible, matching other trailing icons. */
        opacity: 0;
      }
      
      /* On hover of the parent chat item, the un-bookmarked star becomes visible. */
      a.group:hover .chatgptree-bookmark-btn:not(.active) {
        opacity: 1;
      }

      /* An active (bookmarked) star is ALWAYS visible and styled, even without hover.
         This more specific selector wins against ChatGPT's default styles. */
      a.group .chatgptree-bookmark-btn.active {
        opacity: 1 !important;
        color: #6ee7b7 !important;
      }
      
      /* Hover effect for un-bookmarked stars. */
      .chatgptree-bookmark-btn:not(.active):hover {
        color: #6ee7b7; 
        transform: scale(1.15);
      }

      /* Hover effect for already bookmarked stars. */
      .chatgptree-bookmark-btn.active:hover {
        color: #34d399 !important;
        transform: scale(1.15);
      }

      .chatgptree-bookmark-btn svg {
        width: 16px;
        height: 16px;
        stroke: currentColor;
        stroke-width: 2.5 !important; 
        fill: none;
      }
      
      /* When the button is active, we fill the star. */
      a.group .chatgptree-bookmark-btn.active svg {
        fill: currentColor !important;
      }
      /* --- END Bookmark Button --- */

      /* --- NEW: Red Blink Animation & Logged Out Button --- */
      @keyframes chatgptree-red-blink {
        0%, 100% { background-color: rgba(239, 68, 68, 0.8); border-color: #f87171; }
        50% { background-color: rgba(239, 68, 68, 0.4); border-color: rgba(248, 113, 113, 0.5); }
      }
      .chatgptree-logged-out-btn {
        position: fixed; top: 70px; right: 24px; z-index: 99999;
        height: 36px;
        padding: 0 12px;
        gap: 6px;
        margin: 0;
        border: 2px solid #f87171; border-radius: 18px; font-size: 0.9rem; font-weight: 600;
        cursor: pointer; outline: none; display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        white-space: nowrap;
        background-color: rgba(239, 68, 68, 0.8);
        color: #fff;
        animation: chatgptree-red-blink 1.5s ease-in-out 2; /* Blink twice */
      }
      .chatgptree-logged-out-btn:hover {
        background-color: rgba(239, 68, 68, 1.0);
      }
      /* --- END NEW --- */

      .chatgptree-bookmark-tooltip {
        position: fixed;
        z-index: 100001; /* High z-index to appear over everything */
        background: #23272f;
        color: #e5e5e5;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 500;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        opacity: 0;
        pointer-events: none;
        transform: translateY(5px);
        transition: opacity 0.15s ease-out, transform 0.15s ease-out;
        will-change: transform, opacity;
      }
      .chatgptree-bookmark-tooltip.visible {
        opacity: 1;
        transform: translateY(0);
      }

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
      .chatgptree-prompt-jump-container {
        position: fixed;
        top: 120px;
        right: 24px;
        z-index: 99999;
        pointer-events: none; /* Container is passthrough unless scrollable */
      }
      .chatgptree-prompt-jump-container.scrollable {
        max-height: calc(100vh - 144px); /* 120px top + 24px bottom margin */
        overflow-y: auto;
        pointer-events: auto; /* Allow scrolling */
        padding-right: 8px; /* Space for scrollbar */
      }
      .chatgptree-prompt-jump-container.scrollable::-webkit-scrollbar { width: 6px; }
      .chatgptree-prompt-jump-container.scrollable::-webkit-scrollbar-track { background: transparent; }
      .chatgptree-prompt-jump-container.scrollable::-webkit-scrollbar-thumb {
        background-color: rgba(110, 231, 183, 0.5);
        border-radius: 3px;
      }
      .chatgptree-prompt-jump-stack {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .chatgptree-prompt-jump-btn {
        position: relative; width: 36px; height: 36px; padding: 0; margin: 0; border: none;
        background: none; cursor: pointer; outline: none; pointer-events: auto;
      }
      .chatgptree-prompt-jump-btn .btn-content {
        /* This element no longer expands. It's just for the number. */
        position: absolute; top: 0; right: 0; height: 36px; width: 36px;
        display: flex; align-items: center; justify-content: center;
        background: rgba(35, 39, 47, 0.9); color: #6ee7b7;
        border: 2px solid #6ee7b7; border-radius: 18px; font-size: 1rem; font-weight: 600;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .chatgptree-prompt-jump-btn .index {
        line-height: 1;
      }
      .chatgptree-prompt-jump-btn:hover .btn-content {
        background: #6ee7b7; color: #23272f; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }
      .chatgptree-jump-tooltip {
        position: fixed; /* Use fixed to escape parent's overflow */
        top: 0;
        left: 0;
        background: #6ee7b7;
        color: #23272f;
        padding: 8px 16px;
        border-radius: 18px;
        font-size: 0.9rem;
        font-weight: 500;
        white-space: nowrap;
        z-index: 100001;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        max-width: 400px;
        overflow: hidden;
        text-overflow: ellipsis;
        opacity: 0;
        pointer-events: none;
        transform: translate(0, 0) scale(0.95);
        transition: opacity 0.15s ease-out, transform 0.15s ease-out;
        will-change: transform, opacity;
      }
      .chatgptree-jump-tooltip.visible {
        opacity: 1;
        transform: translate(0, 0) scale(1);
      }
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
      
      .chatgptree-zoom-panel {
        position: fixed;
        bottom: 0; /* Flush with the bottom of the screen */
        top: auto; /* Ensure 'top' is not set */
        left: 50%;
        transform: translateX(-50%);
        z-index: 99999;
        display: none;
        align-items: center;
        gap: 10px;
        padding: 6px 16px;
        background: rgba(10, 10, 15, 0.75); /* Correct semi-transparent background */
        color: #d1d5db;
        border-top: 1px solid rgba(255, 255, 255, 0.15); /* Border on top now */
        border-radius: 12px 12px 0 0; /* Rounded top corners, sharp bottom */
        font-size: 0.9rem;
        font-weight: 600;
        box-shadow: 0 -4px 12px rgba(0,0,0,0.3); /* Shadow on top now */
        backdrop-filter: blur(8px); /* Restoring blur as requested in prior steps, will appear transparent */
      }
      .chatgptree-zoom-panel.visible {
        display: flex;
      }
      .chatgptree-zoom-panel .chatgptree-zoom-btn {
        width: 26px;
        height: 26px;
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        font-weight: 400;
        line-height: 1;
        padding-bottom: 1px;
        transition: all 0.2s ease;
      }
      .chatgptree-zoom-panel .chatgptree-zoom-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.1);
      }
      .chatgptree-close-btn {
        position: absolute; top: 20px; left: 20px;
        width: 36px; height: 36px;
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
        .chatgptree-prompt-jump-container { right: 12px; }
        .chatgptree-prompt-jump-btn, .chatgptree-prompt-jump-btn .btn-content { min-width: 32px; height: 32px; }
        .chatgptree-prompt-jump-btn .index { min-width: 32px; height: 32px; font-size: 0.9rem; line-height: 1; }
        .chatgptree-tree-btn { right: 12px; height: 32px; font-size: 0.85rem; padding: 0 10px; }
      }
      
      .chatgptree-runner-container {
        display: flex;
        justify-content: flex-start;
        margin-top: 12px;
        margin-bottom: 16px;
      }
      .chatgptree-run-btn {
        display: inline-flex;
        align-items: center;
        height: 36px;
        padding: 0 16px;
        background: rgba(35, 39, 47, 0.9);
        color: #6ee7b7;
        border: 2px solid #6ee7b7;
        border-radius: 18px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .chatgptree-run-btn:hover:not(:disabled) {
        background: #6ee7b7;
        color: #23272f;
        border-color: #6ee7b7;
      }
      .chatgptree-run-btn:disabled {
        cursor: not-allowed;
        opacity: 0.6;
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
      
      .chatgptree-consent-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 100002;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .chatgptree-consent-dialog {
        background: #23272f;
        color: #e5e5e5;
        border: 2px solid #6ee7b7;
        border-radius: 12px;
        padding: 24px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .chatgptree-consent-title {
        color: #6ee7b7; font-size: 1.25rem; font-weight: 600; margin: 0; text-align: center;
      }
      .chatgptree-consent-text {
        font-size: 0.95rem; line-height: 1.6;
      }
      .chatgptree-consent-text a {
        color: #6ee7b7; text-decoration: underline;
      }
      .chatgptree-consent-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 8px;
      }
      .chatgptree-consent-btn {
        padding: 8px 20px;
        border-radius: 8px;
        border: none;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .chatgptree-consent-btn.confirm {
        background-color: #6ee7b7;
        color: #23272f;
      }
      .chatgptree-consent-btn.confirm:hover {
        background-color: #34d399;
      }
      .chatgptree-consent-btn.cancel {
        background-color: transparent;
        color: #e5e5e5;
        border: 1px solid #6b7280;
      }
      .chatgptree-consent-btn.cancel:hover {
        background-color: rgba(255, 255, 255, 0.1);
        border-color: #9ca3af;
      }

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
        justify-content: space-between; /* Pushes send button to bottom */
      }
      .chatgptree-composer-title {
        color: #6ee7b7;
        font-size: 20px;
        font-weight: 600;
        margin: 0;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;
      }
      #chatgptree-composer-textarea {
        flex-grow: 1;
        width: 100%;
        background: rgba(0, 0, 0, 0.3);
        color: #f9fafb;
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
      #chatgptree-autocomplete-bar {
        flex-grow: 1;
        display: none; /* Hidden by default, becomes 'flex' when active */
        flex-wrap: wrap;
        gap: 8px;
      }
      .chatgptree-suggestion-item {
        background-color: rgba(255, 255, 255, 0.1);
        color: #d1d5db;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .chatgptree-suggestion-item:hover {
        background-color: rgba(255, 255, 255, 0.2);
        border-color: #6ee7b7;
        color: #f9fafb;
      }
      .chatgptree-suggestion-item.active {
        background-color: #6ee7b7;
        border-color: #6ee7b7;
        color: #23272f;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      }
      .chatgptree-suggestion-item.active .chatgptree-suggestion-hint {
        opacity: 0.7;
        font-weight: 400; /* Make hint less prominent than the word */
        margin-right: 5px; /* Add space between hint and word */
      }  
      .chatgptree-composer-bottom-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        min-height: 42px; /* Reserve space to prevent layout shift */
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
        position: absolute;
        top: 16px;
        left: 16px;
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
      .chatgptree-composer-close-btn:hover {
        background: rgba(255, 255, 255, 0.4);
        transform: scale(1.1);
      }

      .chatgptree-token-counter {
        position: fixed;
        top: 7px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 100000;
        padding: 8px 12px;
        background-color: rgba(35, 39, 47, 0.9);
        color: #6ee7b7;
        border: 1px solid rgba(110, 231, 183, 0.4);
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
        user-select: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        display: none;
      }
    `;
    document.head.appendChild(style);
  }

/**
 * Renders a special button indicating the user is logged out.
 */
function renderLoggedOutButton() {
  // First, remove any other tree buttons that might exist to avoid duplicates
  document.querySelector('.chatgptree-tree-btn')?.remove();
  document.querySelector('.chatgptree-logged-out-btn')?.remove();

  const loggedOutBtn = document.createElement('button');
  loggedOutBtn.className = 'chatgptree-logged-out-btn';
  loggedOutBtn.textContent = '🌳 Login Required';
  loggedOutBtn.setAttribute('title', 'ChatGPTree requires you to be logged in.');
  
  // The click handler is managed by the global click listener in contentScript.js
  document.body.appendChild(loggedOutBtn);
}

  /**
   * Injects bookmark star icons into any chat history items that are missing them.
   * This function is designed to be run multiple times safely.
   * @param {Map<string, {id: string, title: string}>} bookmarksMap A map of bookmarked chat IDs.
   */
  function renderBookmarkStars(bookmarksMap) {
    // Select ALL chat items, regardless of any prior injection.
    const chatItems = document.querySelectorAll('a[href^="/c/"]');

    chatItems.forEach(item => {
        // If this item already has our button, do nothing.
        if (item.querySelector('.chatgptree-bookmark-btn')) {
            return;
        }
        
        // This item is missing a button, so we inject one.
        const href = item.getAttribute('href');
        const chatId = href ? href.split('/').pop() : null;
        const chatTitle = item.querySelector('div.truncate')?.textContent?.trim() || 'Untitled Chat';
        
        const trailingContainer = item.querySelector('div.trailing.highlight');
        if (!trailingContainer || !chatId) return;
        
        const starBtn = document.createElement('button');
        starBtn.className = 'chatgptree-bookmark-btn';
        starBtn.dataset.chatId = chatId;
        starBtn.dataset.chatTitle = chatTitle;
        starBtn.innerHTML = STAR_ICON_SVG;

        if (bookmarksMap.has(chatId)) {
            starBtn.classList.add('active');
            starBtn.setAttribute('aria-label', 'Remove bookmark');
            // CHANGED: Set the title attribute for the native browser tooltip.
            starBtn.setAttribute('title', 'Remove ChatGPTree Bookmark');
        } else {
            starBtn.setAttribute('aria-label', 'Add bookmark');
            // CHANGED: Set the title attribute for the native browser tooltip.
            starBtn.setAttribute('title', 'Add ChatGPTree Bookmark');
        }

        trailingContainer.prepend(starBtn);
    });
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
 * It dynamically makes the container scrollable if it exceeds the viewport height.
 */
function renderButtons() {
  // Clear any existing jump button UI
  let container = document.querySelector('.chatgptree-prompt-jump-container');
  if (container) container.remove();

  const prompts = getUserPrompts();
  updateTreeData(prompts);

  if (prompts.length < 2) {
    return;
  }

  // Create the outer container and inner stack
  container = document.createElement('div');
  container.className = 'chatgptree-prompt-jump-container';

  const stack = document.createElement('div');
  stack.className = 'chatgptree-prompt-jump-stack';
  container.appendChild(stack);

  // Hide the entire container if the tree overlay is visible
  const overlay = document.querySelector('.chatgptree-overlay');
  if (overlay && overlay.classList.contains('visible')) {
      container.style.display = 'none';
  }

  // Populate the stack with buttons
  prompts.forEach((prompt, i) => {
    const btn = document.createElement('button');
    btn.className = 'chatgptree-prompt-jump-btn';
    const btnContent = document.createElement('div');
    btnContent.className = 'btn-content';
    const index = document.createElement('span');
    index.className = 'index';
    index.textContent = (i + 1).toString();
    btnContent.appendChild(index);
    btn.appendChild(btnContent);
    
    // The click handler is managed by a global listener in contentScript.js
    btn.dataset.targetMessageId = prompt.dataset.messageId;
    // Store the preview text for the global mouseover handler
    btn.dataset.previewText = getPromptPreview(prompt, 100);

    stack.appendChild(btn);
  });

  // Append to body BEFORE measuring height
  document.body.appendChild(container);

  // After rendering, check if the stack's height exceeds available space
  const availableHeight = window.innerHeight - (120 + 24); // 120px top offset + 24px bottom margin
  if (stack.offsetHeight > availableHeight) {
      container.classList.add('scrollable');
  }
}

 /**
 * Creates the global tooltip element for jump buttons if it doesn't exist.
 */
function createJumpTooltip() {
    if (document.getElementById('chatgptree-jump-tooltip')) return;
    const tooltip = document.createElement('div');
    tooltip.id = 'chatgptree-jump-tooltip';
    tooltip.className = 'chatgptree-jump-tooltip';
    document.body.appendChild(tooltip);
}

/**
 * Shows and positions the global jump button tooltip.
 * @param {HTMLElement} buttonElement The jump button being hovered.
 */
function showJumpTooltip(buttonElement) {
    const tooltip = document.getElementById('chatgptree-jump-tooltip');
    if (!tooltip || !buttonElement.dataset.previewText) return;

    tooltip.textContent = buttonElement.dataset.previewText;

    const btnRect = buttonElement.getBoundingClientRect();
    
    // Temporarily show to measure
    tooltip.style.visibility = 'hidden';
    tooltip.classList.add('visible');
    const tooltipRect = tooltip.getBoundingClientRect();
    tooltip.classList.remove('visible');
    tooltip.style.visibility = 'visible';
    
    // Position it to the left of the button, vertically centered
    const top = btnRect.top + (btnRect.height / 2) - (tooltipRect.height / 2);
    const left = btnRect.left - tooltipRect.width - 12; // 12px gap

    tooltip.style.transform = `translate(${left}px, ${top}px) scale(1)`;
    tooltip.classList.add('visible');
  }

  /**
   * Hides the global jump button tooltip.
   */
  function hideJumpTooltip() {
    const tooltip = document.getElementById('chatgptree-jump-tooltip');
    if (tooltip) {
        tooltip.classList.remove('visible');
        tooltip.style.transform = tooltip.style.transform.replace('scale(1)', 'scale(0.95)');
    }
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
      const elementToHighlight = targetMessageDiv.querySelector('div.bg-token-message-surface') || targetMessageDiv;

      elementToHighlight.classList.remove('chatgptree-bubble-highlight');
      void elementToHighlight.offsetWidth; // Force reflow to restart animation
      elementToHighlight.classList.add('chatgptree-bubble-highlight');
  }

  targetMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    // Ensure the button is not disabled and has no 'disabled' class ---
    treeBtn.disabled = false; 
    treeBtn.classList.remove('disabled');
    treeBtn.setAttribute('title', 'Show conversation tree');
  } else {
    //Do NOT set the disabled property. Only use the class. ---
    treeBtn.disabled = false; // This allows the button to be clicked
    treeBtn.classList.add('disabled');
    treeBtn.setAttribute('title', 'Tree view is not available for pre-existing chats');
  }
}

/**
 * Replaces the default "Edit" pencil icon with our "Root" or "Branch" button.
 */
function replaceEditMessageButtons() {
    const enabledDefaultBg = 'rgba(35, 39, 47, 0.9)';
    const enabledDefaultColor = '#6ee7b7';
    const enabledDefaultBorder = '2px solid #6ee7b7';
    const enabledHoverBg = '#6ee7b7';
    const enabledHoverColor = '#23272f';

    const disabledBackgroundColor = '#d1d5db';
    const disabledTextColor = '#6b7280';

    const editButtons = document.querySelectorAll('button[aria-label="Edit message"]:not([data-chatgptree-modified])');

    editButtons.forEach((button) => {
        button.setAttribute('data-chatgptree-modified', 'true');
        button.classList.remove('hover:bg-token-bg-secondary');
        button.style.borderRadius = '18px';

        const innerSpan = button.querySelector('span');
        if (!innerSpan) return;

        innerSpan.classList.remove('w-8', 'justify-center');
        innerSpan.classList.add('w-auto', 'px-3', 'gap-2');
        innerSpan.style.fontSize = '14px';
        innerSpan.style.fontWeight = '500';
        innerSpan.style.whiteSpace = 'nowrap';
        
        button.style.transition = 'background-color 0.2s ease, border-color 0.2s ease';
        innerSpan.style.transition = 'color 0.2s ease';

        if (!hasCreatedRootButton) {
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
            button.setAttribute('aria-label', 'Create a branch here');

            button.style.backgroundColor = enabledDefaultBg;
            button.style.border = enabledDefaultBorder;
            innerSpan.style.color = enabledDefaultColor;
            innerSpan.innerHTML = '🪵 Create a branch here';

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
 * Creates the standalone zoom control panel if it doesn't exist.
 */
function createZoomPanel() {
    if (document.getElementById('chatgptree-zoom-panel')) return;

    const zoomPanel = document.createElement('div');
    zoomPanel.id = 'chatgptree-zoom-panel';
    zoomPanel.className = 'chatgptree-zoom-panel';
    zoomPanel.innerHTML = `
        <span style="user-select: none;">Zoom:</span>
        <button class="chatgptree-zoom-btn" id="chatgptree-zoom-in-btn" title="Zoom In">+</button>
        <button class="chatgptree-zoom-btn" id="chatgptree-zoom-out-btn" title="Zoom Out">−</button>
    `;
    document.body.appendChild(zoomPanel);
}

/**
 * Creates the main overlay element for the tree view if it doesn't exist.
 */
function createTreeOverlay() {
  let overlay = document.querySelector('.chatgptree-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'chatgptree-overlay';
    // --- HTML Simplified: Zoom controls are now external ---
    overlay.innerHTML = `
      <span class="chatgptree-overlay-title">Chatgptree</span>
      <button class="chatgptree-close-btn">×</button>
      <div class="chatgptree-tree-container">
        <div class="chatgptree-tree"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    console.log('[ChatGPTree DBG] Tree overlay created and appended to body.'); // Added log
  } else {
    console.log('[ChatGPTree DBG] Tree overlay already exists in DOM.'); // Added log
  }
  return overlay;
}

/**
 * Toggles the visibility of the tree view overlay.
 * It self-heals by creating the overlay if it doesn't exist.
 */
function toggleTreeOverlay() {
  console.log('[ChatGPTree DBG] toggleTreeOverlay() called.'); // Added log
  let overlay = document.querySelector('.chatgptree-overlay');
  const treeBtn = document.querySelector('.chatgptree-tree-btn');
  const promptStack = document.querySelector('.chatgptree-prompt-jump-stack');

  // If the overlay doesn't exist (e.g., wiped by React), create it now.
  if (!overlay) {
      console.warn('[ChatGPTree DBG] Tree overlay not found. Re-creating it now.'); // Added log
      createTreeOverlay(); // This function from ui.js creates and appends the overlay.
      overlay = document.querySelector('.chatgptree-overlay'); // Re-query the DOM to get the new reference.
  }
  
  // Ensure the external zoom panel exists
  createZoomPanel();
  const zoomPanel = document.getElementById('chatgptree-zoom-panel');

  // Safety check: If for some reason createTreeOverlay still couldn't create it
  if (!overlay) {
      console.error('[ChatGPTree DBG] FATAL: Failed to find or create the tree overlay. Aborting toggle.');
      return;
  }
  console.log('[ChatGPTree DBG] Tree overlay found. Toggling visibility.'); // Added log


  const isVisible = overlay.classList.toggle('visible');
  
  // Toggle zoom panel visibility along with the overlay
  if (zoomPanel) {
    zoomPanel.classList.toggle('visible', isVisible);
  }

  const displayStyle = isVisible ? 'none' : 'flex';
  if (treeBtn) {
    treeBtn.classList.toggle('active', isVisible);
    // Ensure the tree button and jump buttons are hidden/shown correctly with the overlay
    treeBtn.style.display = isVisible ? 'none' : 'flex';
  }
  if (promptStack) {
    promptStack.style.display = displayStyle;
  }

  if (isVisible) {
    // This is the "reset button" that gets pressed ONCE when opening.
    viewState.isInitialized = false;

    document.addEventListener('keydown', handleEscapeKey);
    updateTreeVisualization();
  } else {
    document.removeEventListener('keydown', handleEscapeKey);
  }

  // Update the counter's visibility whenever the tree is toggled.
  if (window.updateTokenCounterVisibility) {
    window.updateTokenCounterVisibility();
  }
}


/**
 * Handles the 'Escape' key to close the tree view overlay.
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

let expandComposerPollingId = null;

/**
 * Renders the button that opens the composer overlay with added debugging.
 * It uses a polling mechanism to robustly handle React's hydration.
 */
function renderExpandComposerButton() {
    if (expandComposerPollingId) {
        cancelAnimationFrame(expandComposerPollingId);
    }

    let attempts = 0;
    const maxAttempts = 150;

    function attemptToRender() {
        // OLD SELECTOR: '[data-testid="composer-footer-actions"]'
        // This container is no longer present by default in the new UI.
        // ---
        // NEW, FIXED SELECTOR:
        // This targets the container for the microphone/voice buttons, which is always visible.
        const actionsContainer = document.querySelector('[data-testid="composer-trailing-actions"]');

        if (!actionsContainer) {
            if (attempts < maxAttempts) {
                attempts++;
                expandComposerPollingId = requestAnimationFrame(attemptToRender);
            } else {
                console.warn('[ChatGPTree DBG] Timed out waiting for composer actions container.');
            }
            return;
        }

        // This check correctly prevents duplicate buttons from being added.
        if (actionsContainer.querySelector('.chatgptree-expand-btn')) {
            return; // Already exists, do nothing.
        }
        
        console.log('[ChatGPTree DBG] Found composer actions container. Injecting expand button.');
        const expandButton = document.createElement('button');
        expandButton.type = 'button';
        expandButton.className = 'chatgptree-expand-btn';
        expandButton.innerHTML = EXPAND_ICON_SVG;
        expandButton.setAttribute('aria-label', 'Expand composer');
        expandButton.setAttribute('title', 'Expand Composer');
        
        // Prepending to the new container places the button before the other action icons.
        actionsContainer.prepend(expandButton);
    }
    attemptToRender();
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
        textarea.focus();
        document.addEventListener('keydown', handleComposerEscapeKey);
    } else {
        document.removeEventListener('keydown', handleComposerEscapeKey);
    }
}

/**
 * Renders or ensures the presence of the fixed token counter on the page.
 */
function renderTokenCounter() {
    let tokenCounter = document.getElementById('chatgptree-token-counter');

    if (!tokenCounter) {
        tokenCounter = document.createElement('div');
        tokenCounter.id = 'chatgptree-token-counter';
        tokenCounter.className = 'chatgptree-token-counter';
        tokenCounter.textContent = 'Total Tokens: Calculating...'; // Initial state
        document.body.appendChild(tokenCounter);
        console.log('[ChatGPTree DBG] Token counter element created and appended to body.');
    } else {
        // If it exists but might have been moved, ensure it's in the body
        if (tokenCounter.parentElement !== document.body) {
            document.body.appendChild(tokenCounter);
            console.log('[ChatGPTree DBG] Token counter element re-parented to body.');
        }
    }
}