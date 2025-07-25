import React, { useState, useEffect } from 'react';
import './App.css';
import HelpView from './HelpView';
import './HelpView.css';
import BookmarksView from './BookmarksView';
import './BookmarksView.css';

// Define a type for the active tab
type ActiveTab = 'home' | 'shortcuts' | 'bookmarks';

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

  const [isFeaturesExpanded, setIsFeaturesExpanded] = useState(false);

  const toggleFeaturesOverview = () => {
    setIsFeaturesExpanded(!isFeaturesExpanded);
  };

  return (
    <>
      <p className="sidebar-desc">ChatGpt extension for Powerusers</p>
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
      <div className="features-overview">
        <button className="features-toggle" onClick={toggleFeaturesOverview}>
          <span className={`arrow-icon ${isFeaturesExpanded ? 'expanded' : 'collapsed'}`}>▶</span>
          Features Overview
        </button>
        {isFeaturesExpanded && (
          <div className="features-content">
            <h2>Features Overview</h2>
            <p>The extension injects several distinct features into the ChatGPT web application. All functionality can be toggled on or off from the main extension panel.</p>
            <ul>
              <li>
                <strong>Creating Branches:</strong> Branching occurs when you go back and edit a previous prompt, leading to a new conversation path. The extension automatically tracks this.
                <ol>
                  <li><strong>Locate the Prompt:</strong> Scroll up in your chat to the user prompt where you wish to create a branch.</li>
                  <li><strong>Enter Edit Mode:</strong> Hover over the prompt and click the 'Create a branch here' button (not available for the first message).</li>
                  <li><strong>Modify and Submit:</strong> Change the text in the prompt. Once you are satisfied, click the 'Send' button.</li>
                </ol>
                ChatGPT will now generate a new response based on your edited prompt. From the extension's perspective, you have just created a new branch. The original path still exists, but you are now on a new one. Repeat this process to create multiple branches from any point in the conversation, use the tree view to quickly navigate between the branches and see an overview of your conversation.
              </li>
              <li>
                <strong>Conversation Tree View:</strong> For chats with multiple branches, a "Tree" button is added to the UI. Clicking it opens an overlay containing an interactive SVG visualization of the entire conversation structure. You can pan and zoom the tree to inspect different branches. Clicking any node in the tree will navigate the main chat window to that specific point in the conversation. Tree View is not avilable for conversations created before the extension was installed.
              </li>
              <li>
                <strong>In-Browser Code Execution:</strong> A "▶️ Run Code" button is automatically added beneath code blocks. This feature operates in two modes:
                <ul>
                  <li>Client-Side: HTML and JavaScript code is executed in a sandboxed iframe within the page.</li>
                  <li>Server-Side: Code written in other supported languages (e.g., Python, C++) is sent to the public Piston API for execution, and the output (stdout/stderr) is displayed directly below the code block. User consent is required before any code is sent externally.</li>
                </ul>
              </li>
              <li>
                <strong>Expanded Composer with Autocomplete:</strong> An "Expand" button is added near the prompt input field. This toggles a large composer overlay, providing a more spacious textarea for writing and editing long prompts. As you type in the composer, an autocomplete bar suggests common words to complete, the higlighted word can be selected by pressing tab, other words can be selected using arrow keys or the mouse.
              </li>
              <li>
                <strong>Prompt Jump Buttons:</strong> A list of numbered buttons is rendered on the right side of the screen, corresponding to each user prompt in the current conversation. Clicking a button immediately scrolls the view to that prompt. This allows for quick navigation within long chats without manual scrolling.
              </li>
              <li>
                <strong>Keyboard Shortcuts:</strong> The extension provides a set of keyboard shortcuts to operate its features. Key bindings include Alt+T to toggle the tree view, Alt+C for the composer, Alt+[1-9] to activate the prompt jump buttons, and a context-aware Ctrl+Enter to send messages from any input field. Click the "Shortcuts" tab in the sidebar to view the full list of shortcuts.
              </li>
              <li>
                <strong>Chat Bookmarks:</strong> A star icon is added next to each conversation in the chat history sidebar. Clicking this icon bookmarks the chat. A list of all bookmarked conversations is available for quick access within the "Bookmarks" tab of the extension's side panel.
              </li>
              <li>
                <strong>Token Counter:</strong> A small, unobtrusive UI element displays the total token count of the current conversation. 
              </li>
            </ul>
            <p>Have an idea for a feature? Create a discussion on the extensions GitHub page.</p>
          </div>
        )}
      </div>
    </>
  );
};

// --- Tabbed Sidebar Component ---
function Sidebar() {
    const [activeTab, setActiveTab] = useState<ActiveTab>('home');

    return (
        <aside className="sidebar">
            <div>
                <h1 className="sidebar-title">chatgptree</h1>

                <div className="sidebar-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'home' ? 'active' : ''}`}
                        onClick={() => setActiveTab('home')}
                    >
                        Home
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'bookmarks' ? 'active' : ''}`}
                        onClick={() => setActiveTab('bookmarks')}
                    >
                        Bookmarks
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'shortcuts' ? 'active' : ''}`}
                        onClick={() => setActiveTab('shortcuts')}
                    >
                        Shortcuts
                    </button>
                </div>

                <div className="tab-content">
                    {activeTab === 'home' && <MainView />}
                    {activeTab === 'bookmarks' && <BookmarksView />}
                    {activeTab === 'shortcuts' && <HelpView />}
                </div>
            </div>

            <div className="sidebar-footer">
                    <div className="sidebar-footer-content">
                        <span className="footer-version">v1.0.0</span>
                        <a className="footer-link" href="https://github.com/NachiketGadekar1/chatgptree" target="_blank" rel="noopener noreferrer">Contribute</a>
                        <a className="footer-link footer-review" href="https://chrome.google.com/webstore/detail/chatgptree" target="_blank" rel="noopener noreferrer">Review</a>
                    </div>
                </div>
        </aside>
    );
}

function App() {
  return <Sidebar />;
}

export default App;