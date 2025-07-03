// --- Lifecycle & URL State ---
let currentUrl = '';
let observer = null;
let isInitialized = false;
let initRetryCount = 0;
const MAX_INIT_RETRIES = 10;
let currentChatId = null;
let isChatTrackable = false;
let isNewlyCreatedChat = false;
let autosaveInterval = null;
let hasCreatedRootButton = false;

// --- Tree Data Structure ---
let treeData = {
  nodes: new Map(), // messageId -> { messageId, text, parentId, x, y, children: [] }
  branches: new Map(), // messageId -> [childMessageIds]
  activeBranch: [], // Current active branch - array of messageIds in order
  branchStartId: null // Track where branching started when regenerate is clicked
};

// --- Tree View State ---
let viewState = {
  x: 0,
  y: 0,
  scale: 0.75,
  isInitialized: false
};

// --- Panning State ---
let isPanning = false;
let startPoint = { x: 0, y: 0 };
let viewOffset = { x: 0, y: 0 };


// ============================================================================
// SIMPLE UTILITY FUNCTIONS
// ============================================================================

/**
 * A simple promise-based delay helper.
 * @param {number} ms - The number of milliseconds to wait.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extracts the chat ID from the current window URL.
 * @returns {string|null} The chat ID or null.
 */
function getChatIdFromUrl() {
  const match = window.location.href.match(/\/c\/([a-f0-9-]+)/);
  return match ? match[1] : null;
}

/**
 * Truncates prompt text for display.
 * @param {HTMLElement} prompt - The prompt element.
 * @param {number} [maxLength=50] - The max length before truncating.
 * @returns {string} The truncated text.
 */
function getPromptPreview(prompt, maxLength = 50) {
  let text = prompt.textContent.trim();
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '...';
  }
  return text;
}

/**
 * Checks if a DOM element is currently within the viewport.
 * @param {HTMLElement} el - The element to check.
 * @returns {boolean} True if the element is in the viewport.
 */
function isElementInViewport(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}


// ============================================================================
// STORAGE FUNCTIONS
// ============================================================================

/**
 * Serializes the treeData object so it can be stored as JSON.
 * @param {object} treeDataObject - The live treeData state object.
 * @returns {object} A JSON-serializable version of the tree data.
 */
function serializeTreeForStorage(treeDataObject) {
  if (!treeDataObject) return null;
  return {
    nodes: Array.from(treeDataObject.nodes.entries()),
    branches: Array.from(treeDataObject.branches.entries()),
    activeBranch: treeDataObject.activeBranch,
    branchStartId: treeDataObject.branchStartId,
  };
}

/**
 * Deserializes data from storage back into the live treeData format.
 * @param {object} storedData - The JSON object retrieved from storage.
 * @returns {object} The live treeData state object.
 */
function deserializeTreeFromStorage(storedData) {
  if (!storedData) return null;
  return {
    nodes: new Map(storedData.nodes || []),
    branches: new Map(storedData.branches || []),
    activeBranch: storedData.activeBranch || [],
    branchStartId: storedData.branchStartId || null,
  };
}

/**
 * Saves the current conversation's tree to chrome.storage.local.
 * @param {string} chatId - The ID of the chat to save.
 * @param {object} treeDataObject - The live treeData state object.
 */
async function saveTreeToStorage(chatId, treeDataObject) {
  if (!chatId || !treeDataObject || treeDataObject.nodes.size === 0) {
    return;
  }
  try {
    const serializableTree = serializeTreeForStorage(treeDataObject);
    await chrome.storage.local.set({ [chatId]: serializableTree });
    console.log(`Saved tree for chat ID: ${chatId}`);
  } catch (error) {
    console.error('Error saving tree to storage:', error);
  }
}

/**
 * Loads a conversation's tree from chrome.storage.local.
 * @param {string} chatId - The ID of the chat to load.
 * @returns {Promise<object|null>} The deserialized treeData object, or null.
 */
async function loadTreeFromStorage(chatId) {
  if (!chatId) return null;
  try {
    const storageResult = await chrome.storage.local.get(chatId);
    if (storageResult && storageResult[chatId]) {
      console.log(`Found saved tree in storage for chat ID: ${chatId}`);
      return deserializeTreeFromStorage(storageResult[chatId]);
    }
    return null;
  } catch (error) {
    console.error('Error loading tree from storage:', error);
    return null;
  }
}
// --- END OF FILE modules/utils.js ---