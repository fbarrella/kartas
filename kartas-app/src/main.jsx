import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Note: StrictMode is disabled because react-beautiful-dnd is not compatible with React 18 StrictMode
// See: https://github.com/atlassian/react-beautiful-dnd/issues/2399
ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
);
