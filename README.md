# chatgptree

A browser extension that enhances the ChatGPT web interface with an interactive conversation tree, in-browser code execution, bookmarks, and other powerful tools.

![Shields.io Badges](https://img.shields.io/badge/version-0.1.0-blue)
![Shields.io Badges](https://img.shields.io/badge/platform-Chrome%2C%20Edge-brightgreen)
![Shields.io Badges](https://img.shields.io/badge/license-MIT-lightgrey)

## Introduction

ChatGPTree is a browser extension built to augment the standard ChatGPT interface. It introduces a suite of features designed for power users and developers, focusing on better navigation, prompt management, and interactivity. It allows you to visualize conversation branches, run code snippets directly, bookmark important chats, and control the interface with a rich set of keyboard shortcuts.

## Key Features

-   **Conversation Tree View**: Visualize your entire chat history as an interactive, pannable, and zoomable SVG tree. Easily track and navigate between different conversation branches, ensuring you never lose context in complex, forked discussions.

-   **Code Execution**: Run code blocks directly in the chat interface. This feature supports client-side languages (HTML, JavaScript) in a sandboxed iframe and over 70 server-side languages (Python, C++, Go, etc.) via the Piston API.

-   **Expanded Composer**: Open a large, distraction-free text editor for writing long or complex prompts. The composer includes word-based autocomplete to help speed up your writing process.

-   **Prompt Jump Buttons**: Every prompt in the conversation is assigned an index. Numbered buttons appear on the right side of the screen, allowing you to instantly jump to any part of the chat. These can also be triggered with `Alt` + `[1-9]` shortcuts.

-   **Full Keyboard Control**: A comprehensive set of keyboard shortcuts allows for efficient, mouse-free operation. Navigate branches, open the tree view, stop code generation, and more.

-   **Chat Bookmarking**: Save important or frequently-used chats with a single click in the chat history sidebar. Access all your bookmarks from the extension's side panel for quick access.

-   **Token Counter**: A simple, unobtrusive counter displays the total token count for the current conversation, helping you keep track of context length.


## Getting Started

You can install and use chatgptree in two ways.

### From the Web Store (Recommended)

*Coming soon. Links to the official Chrome Web Store and other stores will be placed here.*

### From Source (For Developers)

If you want to build the extension from the source code, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/nachiketgadekar1/chatgptree.git
    cd chatgptree
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Build the extension:**
    ```bash
    npm run build
    ```
    This will create a `build` directory in the project folder.

4.  **Load the extension in your browser:**
    -   Open your browser and navigate to `chrome://extensions` (for Chrome) or `edge://extensions` (for Edge).
    -   Enable "Developer mode".
    -   Click "Load unpacked".
    -   Select the `build` directory that was created in the previous step.

