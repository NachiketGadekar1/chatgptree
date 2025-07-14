import React, { useState, useEffect } from 'react';
import './BookmarksView.css';

interface Bookmark {
  id: string;
  title: string;
}

const BOOKMARKS_STORAGE_KEY = 'chatgptree_bookmarks';

const BookmarksView: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const fetchBookmarks = () => {
    chrome.storage.local.get(BOOKMARKS_STORAGE_KEY, (result) => {
      if (result[BOOKMARKS_STORAGE_KEY] && Array.isArray(result[BOOKMARKS_STORAGE_KEY])) {
        // Sort by title alphabetically for consistent order
        const sortedBookmarks = result[BOOKMARKS_STORAGE_KEY].sort((a: Bookmark, b: Bookmark) => 
            a.title.localeCompare(b.title)
        );
        setBookmarks(sortedBookmarks);
      } else {
        setBookmarks([]);
      }
    });
  };

  useEffect(() => {
    fetchBookmarks();

    const handleMessage = (message: any) => {
      if (message.action === 'BOOKMARKS_UPDATED') {
        fetchBookmarks();
      }
      return true;
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const handleBookmarkClick = (chatId: string) => {
    const url = `https://chatgpt.com/c/${chatId}`;
    chrome.tabs.create({ url });
  };

  return (
    <div className="bookmarks-view">
      <h2 className="bookmarks-title">Bookmarked Chats</h2>
      {bookmarks.length > 0 ? (
        <ul className="bookmarks-list">
          {bookmarks.map((bookmark) => (
            <li key={bookmark.id}>
              <button
                className="bookmark-item"
                onClick={() => handleBookmarkClick(bookmark.id)}
                title={`Open: ${bookmark.title}`}
              >
                <span className="bookmark-title">{bookmark.title}</span>
                <svg className="bookmark-open-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="bookmarks-empty">
          Click the star icon next to a chat in the ChatGPT sidebar to save it here.
        </p>
      )}
    </div>
  );
};

export default BookmarksView;