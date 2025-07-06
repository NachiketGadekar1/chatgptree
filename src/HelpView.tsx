import React, { useState, useEffect } from 'react';
import './HelpView.css';

interface Shortcuts {
  [key: string]: string | string[]; // Can be a string or an array of strings
}

// Map selectors to human-readable descriptions
const actionDescriptions: { [key: string]: string } = {
  '.chatgptree-tree-btn': 'Toggle Conversation Tree',
  '.chatgptree-expand-btn': 'Open Expanded Composer',
  'button[aria-label="Create a branch here"]': 'Branch from Latest Prompt',
  'button[data-testid="stop-button"]': 'Stop Generating Response',
  '#chatgptree-composer-send-btn': 'Send Message',
};

const HelpView: React.FC = () => {
  const [shortcuts, setShortcuts] = useState<Shortcuts | null>(null);

  useEffect(() => {
    chrome.storage.local.get('chatgptree_shortcuts', (result) => {
      if (result.chatgptree_shortcuts) {
        setShortcuts(result.chatgptree_shortcuts);
      }
    });
  }, []);

  const formatShortcut = (shortcut: string) => {
    return shortcut.split('+').map(key =>
      `<kbd class="help-kbd">${key.charAt(0).toUpperCase() + key.slice(1)}</kbd>`
    ).join(' + ');
  };

  const getActionDescription = (value: string | string[]) => {
    const primarySelector = Array.isArray(value) ? value[0] : value;
    return actionDescriptions[primarySelector] || 'Unknown Action';
  };

  return (
    <div className="help-view">
      <h2 className="help-title">Keyboard Shortcuts</h2>
      <p className="help-desc">Use these shortcuts from anywhere on the page to quickly access features.</p>
      
      <h3 className="help-subtitle">Extension Shortcuts</h3>
      {shortcuts ? (
        <ul className="help-list">
          {Object.entries(shortcuts).map(([key, value]) => (
            <li key={key} className="help-list-item">
              <span
                className="help-shortcut"
                dangerouslySetInnerHTML={{ __html: formatShortcut(key) }}
              />
              <span className="help-action">
                {getActionDescription(value)}
              </span>
            </li>
          ))}
          <li className="help-list-item">
            <span className="help-shortcut">
              <kbd className="help-kbd">Alt</kbd> + <kbd className="help-kbd">1-9</kbd>
            </span>
            <span className="help-action">Jump to Numbered Prompt</span>
          </li>
        </ul>
      ) : (
        <p>Loading shortcuts...</p>
      )}

      <h3 className="help-subtitle">ChatGPT Default Shortcuts</h3>
      <ul className="help-list">
        <li className="help-list-item">
          <span className="help-shortcut">
            <kbd className="help-kbd">Ctrl</kbd> + <kbd className="help-kbd">/</kbd>
          </span>
          <span className="help-action">Show All Shortcuts</span>
        </li>
      </ul>

      <p className="help-note">
          Note: Shortcuts are active globally on the page.
      </p>
    </div>
  );
};

export default HelpView;