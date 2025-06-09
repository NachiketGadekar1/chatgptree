import React from 'react';
import './App.css';

function Sidebar() {
  return (
    <aside className="sidebar">
      <h1 className="sidebar-title">chatgptree</h1>
      <p className="sidebar-desc">Enhance your ChatGPT experience with a tree view and more.</p>
      <div className="sidebar-footer">v0.1.0</div>
    </aside>
  );
}

function App() {
  return <Sidebar />;
}

export default App;
