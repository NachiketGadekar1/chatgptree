(function() {
  'use strict';

  // --- MODULE STATE ---
  let fuse = null;
  let wordlist = null;
  let textarea = null;
  let suggestionBar = null;
  let debouncedHandleInput = null;

  let state = {
    isVisible: false,
    suggestions: [],
    activeIndex: 0,
    currentWord: '',
    wordStartIndex: -1,
  };

  const MAX_SUGGESTIONS = 7;
  const WORD_BREAK_CHARS = /[\s.,;()[\]{}<>:"'|`~+=\-*\/\\]/;

  /**
   * Fetches the wordlist and initializes the Fuse.js instance.
   * This is called only once.
   */
  async function loadWordlistAndInitFuse() {
    try {
      const response = await fetch(chrome.runtime.getURL('wordlist.json'));
      wordlist = await response.json();
      
      // Configure Fuse.js to use frequency for better relevance.
      // We search the 'word' field, but weigh the 'freq' field heavily in sorting.
      // A lower 'freq' number means a more common word.
      const options = {
        isCaseSensitive: false,
        includeScore: true,
        shouldSort: true,
        keys: [
          { name: 'word', weight: 0.6 },
          { name: 'freq', weight: 0.4 }
        ],
        // Lower threshold means stricter matching
        threshold: 0.4,
      };
      
      fuse = new Fuse(wordlist, options);
      console.log('[ChatGPTree] Autocomplete wordlist loaded and Fuse.js initialized.');
    } catch (error) {
      console.error('[ChatGPTree] Failed to load wordlist for autocomplete:', error);
    }
  }

  /**
   * Attaches event listeners and sets up the autocomplete feature for a given textarea.
   * @param {HTMLTextAreaElement} textareaElement The composer textarea.
   */
  async function initialize(textareaElement) {
    if (!fuse) {
      await loadWordlistAndInitFuse();
    }
    if (!fuse) return; // Don't initialize if loading failed

    textarea = textareaElement;
    suggestionBar = document.getElementById('chatgptree-autocomplete-bar');

    // Debounce the input handler to prevent lag
    debouncedHandleInput = debounce(handleInput, 150);

    textarea.addEventListener('input', debouncedHandleInput);
    textarea.addEventListener('keydown', handleKeydown, true); // Use capture phase for Tab/Enter
    textarea.addEventListener('blur', hideSuggestions);
    suggestionBar.addEventListener('click', handleSuggestionClick);

    console.log('[ChatGPTree] Autocomplete initialized for composer.');
  }

  /**
   * Removes all event listeners and cleans up the state.
   */
  function destroy() {
    if (textarea) {
      textarea.removeEventListener('input', debouncedHandleInput);
      textarea.removeEventListener('keydown', handleKeydown, true);
      textarea.removeEventListener('blur', hideSuggestions);
    }
    if (suggestionBar) {
        suggestionBar.removeEventListener('click', handleSuggestionClick);
    }
    hideSuggestions();
    textarea = null;
    suggestionBar = null;
    console.log('[ChatGPTree] Autocomplete destroyed.');
  }

  /**
   * Handles the 'input' event on the textarea to update suggestions.
   */
  function handleInput() {
    const { word, startIndex } = getCurrentWordInfo(textarea);

    if (!word) {
      hideSuggestions();
      return;
    }

    state.currentWord = word;
    state.wordStartIndex = startIndex;

    const results = fuse.search(word);
    // The result from Fuse is now an object like { item: {word: 'the', freq: 1}, score: 0.123 }
    const suggestions = results.slice(0, MAX_SUGGESTIONS).map(res => res.item.word);

    if (suggestions.length > 0) {
      renderSuggestions(suggestions);
    } else {
      hideSuggestions();
    }
  }

  /**
   * Handles special key presses for navigation and selection.
   * @param {KeyboardEvent} e
   */
  function handleKeydown(e) {
    if (!state.isVisible) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      state.activeIndex = (state.activeIndex + 1) % state.suggestions.length;
      updateHighlight();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      state.activeIndex = (state.activeIndex - 1 + state.suggestions.length) % state.suggestions.length;
      updateHighlight();
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      acceptSuggestion(state.activeIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      hideSuggestions();
    }
  }

  /**
   * Handles clicks on the suggestion bar.
   * @param {MouseEvent} e
   */
  function handleSuggestionClick(e) {
      const button = e.target.closest('.chatgptree-suggestion-item');
      if (button && button.dataset.index) {
          acceptSuggestion(parseInt(button.dataset.index, 10));
      }
  }

  /**
   * Renders the suggestion items in the bar.
   * @param {string[]} suggestions
   */
  function renderSuggestions(suggestions) {
    state.suggestions = suggestions;
    state.activeIndex = 0;
    state.isVisible = true;

    suggestionBar.innerHTML = suggestions.map((s, i) =>
      `<button class="chatgptree-suggestion-item" data-index="${i}">${s}</button>`
    ).join('');
    suggestionBar.style.display = 'flex';
    updateHighlight();
  }

  /**
   * Hides the suggestion bar and resets the state.
   */
  function hideSuggestions() {
    if (suggestionBar) {
        suggestionBar.style.display = 'none';
        suggestionBar.innerHTML = '';
    }
    state.isVisible = false;
    state.suggestions = [];
    state.activeIndex = 0;
  }

  /**
   * Updates which suggestion item has the 'active' class.
   */
  function updateHighlight() {
    const items = suggestionBar.querySelectorAll('.chatgptree-suggestion-item');
    items.forEach((item, i) => {
      item.classList.toggle('active', i === state.activeIndex);
    });
  }

  /**
   * Replaces the current partial word in the textarea with the selected suggestion.
   * @param {number} index - The index of the suggestion to accept.
   */
  function acceptSuggestion(index) {
    const acceptedWord = state.suggestions[index];
    if (!acceptedWord) return;

    const originalValue = textarea.value;
    const before = originalValue.substring(0, state.wordStartIndex);
    const after = originalValue.substring(textarea.selectionStart);
    
    // Add a space after the completed word for better flow
    textarea.value = before + acceptedWord + ' ' + after;

    // Set cursor position after the inserted word and space
    const newCursorPos = (before + acceptedWord + ' ').length;
    textarea.focus();
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    
    // Manually trigger the debounced input event so the suggestions disappear
    debouncedHandleInput();

    hideSuggestions();
  }

  /**
   * Gets the word currently being typed by the user at the caret.
   * @param {HTMLTextAreaElement} el - The textarea element.
   * @returns {{word: string, startIndex: number}}
   */
  function getCurrentWordInfo(el) {
    const text = el.value;
    const caretPos = el.selectionStart;

    let startIndex = caretPos - 1;
    while (startIndex >= 0 && !WORD_BREAK_CHARS.test(text[startIndex])) {
      startIndex--;
    }
    startIndex++; // Move to the start of the word

    const word = text.substring(startIndex, caretPos);
    return { word, startIndex };
  }
  
  /**
   * Creates a debounced function that delays invoking `func` until after `wait`
   * milliseconds have elapsed since the last time the debounced function was invoked.
   * NOTE: This is a local copy to make the module self-contained.
   * @param {Function} func The function to debounce.
   * @param {number} wait The number of milliseconds to delay.
   * @returns {Function} Returns the new debounced function.
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // --- EXPOSE MODULE ---
  window.chatGPTreeAutocomplete = {
    initialize,
    destroy,
  };

})();