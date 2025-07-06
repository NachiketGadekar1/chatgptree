import React, { useState, useEffect } from 'react';
import './App.css';
import HelpView from './HelpView';
import './HelpView.css';

// Define a type for the active tab
type ActiveTab = 'main' | 'help';

// --- Main View Component ---
const MainView: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(true);

  // Load the initial state from storage when the component mounts
  useEffect(() => {
    chrome.storage.local.get('chatgptree_enabled', (result) => {
      // Default to true if not set.
      if (typeof result.chatgptree_enabled === 'boolean') {
        setIsEnabled(result.chatgptree_enabled);
      }
    });
  }, []);

  const handleToggleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newEnabledState = event.target.checked;
    setIsEnabled(newEnabledState);

    // Persist the state in storage
    chrome.storage.local.set({ chatgptree_enabled: newEnabledState });

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
    <>
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
    </>
  );
};

// --- Tabbed Sidebar Component ---
function Sidebar() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('main');

  return (
    <aside className="sidebar">
      <div>
        <h1 className="sidebar-title">chatgptree</h1>

        <div className="sidebar-tabs">
          <button
            className={`tab-btn ${activeTab === 'main' ? 'active' : ''}`}
            onClick={() => setActiveTab('main')}
          >
            Main
          </button>
          <button
            className={`tab-btn ${activeTab === 'help' ? 'active' : ''}`}
            onClick={() => setActiveTab('help')}
          >
            Help
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'main' && <MainView />}
          {activeTab === 'help' && <HelpView />}
        </div>
      </div>

      <div className="sidebar-footer">v0.9.0</div>
    </aside>
  );
}

function App() {
  return <Sidebar />;
}

export default App;