import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// I18N-01: side-effect import runs i18n.init() synchronously, reading the
// cached language preference before first render — same pre-paint idea as the
// theme read below, just via i18next's own lng option instead of a DOM attribute.
import './i18n';

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
