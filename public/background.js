'use strict';

// --- Piston API Integration ---
let pistonRuntimes = [];

async function fetchAndCacheRuntimes() {
  try {
    const response = await fetch('https://emkc.org/api/v2/piston/runtimes');
    if (!response.ok) {
      throw new Error(`Piston API responded with status: ${response.status}`);
    }
    const runtimes = await response.json();
    // Filter out duplicates, keeping the latest version, and map aliases
    const latestRuntimes = new Map();
    runtimes.forEach(runtime => {
        const processAlias = (alias) => {
            const existing = latestRuntimes.get(alias);
            if (!existing || new Date(runtime.built_at) > new Date(existing.built_at)) {
                latestRuntimes.set(alias, runtime);
            }
        };
        processAlias(runtime.language);
        if (runtime.aliases) {
            runtime.aliases.forEach(processAlias);
        }
    });

    pistonRuntimes = Array.from(latestRuntimes.values());
    console.log(`[ChatGPTree] Successfully fetched and cached ${pistonRuntimes.length} unique Piston runtimes/aliases.`);
  } catch (error) {
    console.error('[ChatGPTree] Failed to fetch Piston runtimes:', error);
    pistonRuntimes = []; // Ensure it's empty on failure
  }
}

// --- Event Listeners ---

// Combined onInstalled listener
chrome.runtime.onInstalled.addListener(() => {
  // Existing side panel logic
  chrome.sidePanel.setOptions({
    path: 'index.html',
    enabled: true
  });
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  // New Piston runtime fetching logic
  fetchAndCacheRuntimes();
});

// Fetch runtimes on browser startup
chrome.runtime.onStartup.addListener(fetchAndCacheRuntimes);

// Listen for requests from content scripts for the runtimes list
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'GET_PISTON_RUNTIMES') {
    if (pistonRuntimes.length > 0) {
      sendResponse({ runtimes: pistonRuntimes });
    } else {
      // If the cache is empty (e.g., first run after install), try fetching again
      fetchAndCacheRuntimes().then(() => {
        sendResponse({ runtimes: pistonRuntimes });
      });
      return true; // Indicates an async response
    }
  }
  // Keep the message channel open for other potential listeners.
  return true;
});