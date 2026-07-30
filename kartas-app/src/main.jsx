import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// DM-03: apply a cached theme preference synchronously, before React mounts,
// so the page never flashes light before switching to dark. AuthContext
// reconciles this with the server's value once checkExistingAuth() resolves.
if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
}

// Note: StrictMode remains disabled for consistency with the rest of the app;
// @hello-pangea/dnd (migrated from react-beautiful-dnd, DND-01) fixes the
// upstream React 18 StrictMode incompatibility this comment used to describe,
// so re-enabling StrictMode is a safe candidate for a future, separate change.
ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
);
