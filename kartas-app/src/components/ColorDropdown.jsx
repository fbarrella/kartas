import React, { useState, useRef, useEffect } from 'react';

const ColorDot = ({ color }) => (
    <span
        style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: color || 'var(--color-neutral-300)',
            flexShrink: 0
        }}
    />
);

// Generic replacement for a native <select> when options need a color swatch
// (e.g. epics) — native <option> elements can't render a background color.
const ColorDropdown = ({ options, value, onChange, placeholder = 'Select…' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const selected = options.find(opt => opt.value === value);

    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            setIsOpen(false);
        }
    };

    return (
        <div className="color-dropdown" ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                type="button"
                className="form-select color-dropdown-trigger"
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer'
                }}
            >
                <ColorDot color={selected?.color} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selected ? selected.label : placeholder}
                </span>
            </button>

            {isOpen && (
                <div className="color-dropdown-menu" role="listbox">
                    {options.map(opt => (
                        <button
                            type="button"
                            key={opt.value}
                            role="option"
                            aria-selected={opt.value === value}
                            className="dropdown-item"
                            onClick={() => { onChange(opt.value); setIsOpen(false); }}
                        >
                            <ColorDot color={opt.color} />
                            <span>{opt.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ColorDropdown;
