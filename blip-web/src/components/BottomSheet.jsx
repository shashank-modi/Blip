export default function BottomSheet({ isOpen, onClose, title, children }) {
    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="overlay-backdrop show"
            onClick={onClose}
            style={{ display: 'block' }}
        >
            <div
                className="overlay-sheet show"
                onClick={(e) => e.stopPropagation()}
                style={{
                    display: 'block',
                    maxHeight: '85vh',
                    overflowY: 'auto',
                }}
            >
                <div className="overlay-handle"></div>
                <div className="overlay-title">{title}</div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
