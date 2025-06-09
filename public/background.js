// Placeholder for background logic. Required for Manifest V3 service worker.
// You can add extension event listeners here if needed.

// Add this to enable side panel on ChatGPT and open on icon click
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({
    path: 'index.html',
    enabled: true
  });
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
