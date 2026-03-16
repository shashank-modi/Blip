import { useState, useRef } from 'react';

const ACTION_WIDTH = 72;
const TRIGGER_THRESHOLD = 56;
const AUTO_TRIGGER_AT = 130;
const TAP_MAX_MOVE = 6;

export default function SwipeableItem({ children, onSwipeLeft, onSwipeRight, leftLabel = 'Delete', rightLabel = 'Edit' }) {
    const [offset, setOffset] = useState(0);
    const [snapped, setSnapped] = useState(null);
    const [animating, setAnimating] = useState(false);

    const startX = useRef(0);
    const startY = useRef(0);
    const startOffset = useRef(0);
    const active = useRef(false);
    const dirLocked = useRef(null);    // 'h' | 'v' | null
    const moved = useRef(false);       // horizontal drag exceeded TAP_MAX_MOVE
    const isScrolling = useRef(false); // vertical scroll — suppresses tap
    const childRef = useRef(null);

    const snapClose = (cb) => {
        setAnimating(true);
        setOffset(0);
        setSnapped(null);
        setTimeout(() => { setAnimating(false); cb?.(); }, 300);
    };

    const onDown = (clientX, clientY) => {
        startX.current = clientX;
        startY.current = clientY;
        startOffset.current = offset;
        active.current = true;
        dirLocked.current = null;
        moved.current = false;
        isScrolling.current = false;
    };

    const onMove = (clientX, clientY, e) => {
        if (!active.current) return;
        const dx = clientX - startX.current;
        const dy = clientY - startY.current;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (dirLocked.current === null) {
            if (absDx < 4 && absDy < 4) return;
            if (absDy > absDx) {
                // Vertical wins — mark as scroll, never treat as tap
                dirLocked.current = 'v';
                isScrolling.current = true;
                return;
            }
            dirLocked.current = 'h';
        }

        if (dirLocked.current === 'v') return;

        e?.preventDefault();
        if (absDx > TAP_MAX_MOVE) moved.current = true;

        let next = startOffset.current + dx;
        if (next > ACTION_WIDTH) next = ACTION_WIDTH + (next - ACTION_WIDTH) * 0.2;
        if (next < -ACTION_WIDTH) next = -ACTION_WIDTH + (next + ACTION_WIDTH) * 0.2;
        setOffset(next);
    };

    const onUp = (clientX) => {
        if (!active.current) return;
        active.current = false;

        const dx = clientX - startX.current;

        // Vertical scroll ended — do nothing, let the page scroll handler take over
        if (isScrolling.current) return;

        // Pure tap — no horizontal movement
        if (!moved.current) {
            if (snapped !== null) {
                snapClose();
            } else {
                const clickable = childRef.current?.querySelector('[data-clickable]')
                    || childRef.current?.firstElementChild;
                if (clickable) {
                    clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                }
            }
            return;
        }

        // Horizontal drag — snap logic
        if (dx < -AUTO_TRIGGER_AT) { snapClose(); onSwipeLeft?.(); return; }
        if (dx > AUTO_TRIGGER_AT) { snapClose(); onSwipeRight?.(); return; }

        setAnimating(true);
        if (offset < -TRIGGER_THRESHOLD) {
            setOffset(-ACTION_WIDTH); setSnapped('left');
        } else if (offset > TRIGGER_THRESHOLD) {
            setOffset(ACTION_WIDTH); setSnapped('right');
        } else {
            setOffset(0); setSnapped(null);
        }
        setTimeout(() => setAnimating(false), 300);
    };

    const handleMouseDown = (e) => { if (e.button !== 0) return; onDown(e.clientX, e.clientY); };
    const handleMouseMove = (e) => { onMove(e.clientX, e.clientY, e); };
    const handleMouseUp = (e) => { onUp(e.clientX); };

    const handleTouchStart = (e) => { onDown(e.touches[0].clientX, e.touches[0].clientY); };
    const handleTouchMove = (e) => { onMove(e.touches[0].clientX, e.touches[0].clientY, e); };
    const handleTouchEnd = (e) => { onUp(e.changedTouches[0].clientX); };

    const onContentClick = (e) => {
        if (moved.current || isScrolling.current) {
            e.stopPropagation();
            e.preventDefault();
        }
    };

    const leftProgress = Math.min(1, Math.max(0, -offset / ACTION_WIDTH));
    const rightProgress = Math.min(1, Math.max(0, offset / ACTION_WIDTH));

    return (
        <div
            style={{
                position: 'relative',
                borderRadius: '14px',
                overflow: 'hidden',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'pan-y',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Delete — revealed on swipe left */}
            <div
                style={{
                    position: 'absolute',
                    right: 0, top: 0, bottom: 0,
                    width: Math.max(ACTION_WIDTH, -offset),
                    background: 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 3,
                    opacity: leftProgress,
                    transform: `scale(${0.8 + leftProgress * 0.2})`,
                    transition: animating ? 'opacity 0.25s, transform 0.25s' : 'none',
                    cursor: 'pointer',
                    borderRadius: '0 14px 14px 0',
                }}
                onMouseDown={e => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); snapClose(); onSwipeLeft?.(); }}
            >
                <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                </svg>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'white', letterSpacing: '0.3px' }}>{leftLabel}</span>
            </div>

            {/* Edit — revealed on swipe right */}
            <div
                style={{
                    position: 'absolute',
                    left: 0, top: 0, bottom: 0,
                    width: Math.max(ACTION_WIDTH, offset),
                    background: 'var(--indigo)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 3,
                    opacity: rightProgress,
                    transform: `scale(${0.8 + rightProgress * 0.2})`,
                    transition: animating ? 'opacity 0.25s, transform 0.25s' : 'none',
                    cursor: 'pointer',
                    borderRadius: '14px 0 0 14px',
                }}
                onMouseDown={e => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); snapClose(); onSwipeRight?.(); }}
            >
                <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h11a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'white', letterSpacing: '0.3px' }}>{rightLabel}</span>
            </div>

            {/* Foreground content */}
            <div
                ref={childRef}
                onClick={onContentClick}
                style={{
                    position: 'relative',
                    zIndex: 1,
                    transform: `translateX(${offset}px)`,
                    transition: animating ? 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.15)' : 'none',
                    willChange: 'transform',
                    background: 'var(--card)',
                    borderRadius: '14px',
                    cursor: 'pointer',
                }}
            >
                {children}
            </div>
        </div>
    );
}