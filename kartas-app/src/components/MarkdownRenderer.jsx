import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// No raw-HTML execution (no rehype-raw, no dangerouslySetInnerHTML) — prevents stored-XSS via descriptions.
const MarkdownRenderer = ({ content, className = '' }) => {
    if (!content) return null;

    return (
        <div className={`markdown-content ${className}`.trim()}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
