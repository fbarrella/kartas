import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownRenderer from './MarkdownRenderer';

// Controlled component: value/onChange own the single source of truth.
// Switching Write <-> Preview never loses edits — both tabs render the
// same `value` state; only the textarea (Write) mutates it.
const MarkdownEditor = ({ value, onChange, placeholder = '', rows = 10 }) => {
    const { t } = useTranslation(['storyDetail']);
    const [activeTab, setActiveTab] = useState('write');

    return (
        <div className="markdown-editor">
            <div className="flex flex-gap-sm mb-sm">
                <button
                    type="button"
                    className={`btn btn-sm ${activeTab === 'write' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('write')}
                >
                    {t('storyDetail:markdownEditor.write')}
                </button>
                <button
                    type="button"
                    className={`btn btn-sm ${activeTab === 'preview' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('preview')}
                >
                    {t('storyDetail:markdownEditor.preview')}
                </button>
            </div>

            {activeTab === 'write' ? (
                <textarea
                    className="form-textarea"
                    style={{ width: '100%' }}
                    rows={rows}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
            ) : (
                <div
                    className="form-textarea markdown-preview"
                    style={{ width: '100%', height: `${rows * 24}px`, overflowY: 'auto' }}
                >
                    {value ? (
                        <MarkdownRenderer content={value} />
                    ) : (
                        <span className="text-muted">{t('storyDetail:markdownEditor.nothingToPreview')}</span>
                    )}
                </div>
            )}
        </div>
    );
};

export default MarkdownEditor;
