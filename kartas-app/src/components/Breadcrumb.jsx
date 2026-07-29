import React from 'react';
import { Link } from 'react-router-dom';

const Breadcrumb = ({ items = [] }) => {
    if (items.length === 0) return null;

    return (
        <nav className="breadcrumb" aria-label="Breadcrumb">
            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                return (
                    <span key={index} className="breadcrumb-item">
                        {!isLast && item.to ? (
                            <Link to={item.to} className="breadcrumb-link">{item.label}</Link>
                        ) : (
                            <span className="breadcrumb-current">{item.label}</span>
                        )}
                        {!isLast && <span className="breadcrumb-separator" aria-hidden="true">/</span>}
                    </span>
                );
            })}
        </nav>
    );
};

export default Breadcrumb;
