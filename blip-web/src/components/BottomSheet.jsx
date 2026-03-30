import { createPortal } from 'react-dom';

export default function BottomSheet({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;

    return createPortal(
        <div
            className={`overlay-backdrop ${isOpen ? 'show' : ''}`}
            onClick={onClose}
        >
            <div
                className={`overlay-sheet ${isOpen ? 'show' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="overlay-handle"></div>

                {title && <div className="overlay-title">{title}</div>}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    WebkitOverflowScrolling: 'touch'
                }}>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}