import React, { useState } from 'react';
import './App.css';

function Sidebar() {
  const [isEnabled, setIsEnabled] = useState(true);

  const handleToggleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newEnabledState = event.target.checked;
    setIsEnabled(newEnabledState);

    // Find the active ChatGPT tab and send a message to its content script
    chrome.tabs.query({ active: true, url: ["https://chat.openai.com/*", "https://chatgpt.com/*"] }, (tabs) => {
      if (tabs.length > 0 && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'TOGGLE_EXTENSION',
          enabled: newEnabledState,
        });
      }
    });
  };

  return (
    <aside className="sidebar">
      <div>
        <h1 className="sidebar-title">chatgptree</h1>
        <p className="sidebar-desc">Enhance your ChatGPT experience with a tree view and more.</p>

        <div className="toggle-container">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={handleToggleChange}
            />
            <span className="slider"></span>
          </label>
          <span className="toggle-label">
            {isEnabled ? 'Extension On' : 'Extension Off'}
          </span>
        </div>
      </div>

      <div className="sidebar-footer">v0.1.0</div>
    </aside>
  );
}

function App() {
  return <Sidebar />;
}

export default App;