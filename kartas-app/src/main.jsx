import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// DM-03: apply a cached theme preference synchronously, before React mounts,
// so the page never flashes light before switching to dark. AuthContext
// reconciles this with the server's value once checkExistingAuth() resolves.
if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
}

// Note: StrictMode is disabled because react-beautiful-dnd is not compatible with React 18 StrictMode
// See: https://github.com/atlassian/react-beautiful-dnd/issues/2399
ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
);
