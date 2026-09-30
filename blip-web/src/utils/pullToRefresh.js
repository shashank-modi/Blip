export const REFRESH_THRESHOLD = 56;
export const pullDistance = delta => Math.min(88, Math.max(0, delta) * 0.5);

// Listen once per screen, keeping gesture state out of React render closures.
export function attachPullToRefresh(element, { canStart, onPull, onRefresh, onError = () => {} }) {
    let gesture = null;
    let distance = 0;
    let busy = false;
    let disposed = false;
    const reset = () => { gesture = null; distance = 0; onPull(0); };
    const start = event => {
        reset();
        if (busy || !canStart() || event.touches.length !== 1 || element.scrollTop > 0) return;
        const target = event.target;
        if (target.closest?.('input, textarea, select, button, a, summary, [contenteditable="true"], [role="dialog"], [data-no-pull]')) return;
        // A nested list or sheet owns its own scrolling, even at its top edge.
        for (let node = target; node && node !== element; node = node.parentElement) {
            if (node.scrollHeight > node.clientHeight && /auto|scroll/.test(getComputedStyle(node).overflowY)) return;
        }
        gesture = { x: event.touches[0].clientX, y: event.touches[0].clientY, locked: false };
    };
    const move = event => {
        if (!gesture) return;
        if (!canStart() || event.touches.length !== 1 || element.scrollTop > 0) { reset(); return; }
        const dx = event.touches[0].clientX - gesture.x;
        const dy = event.touches[0].clientY - gesture.y;
        if (!gesture.locked) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
            if (dy <= 0 || Math.abs(dx) >= dy) { reset(); return; }
            gesture.locked = true;
        }
        if (event.cancelable) event.preventDefault();
        distance = pullDistance(dy);
        onPull(distance);
    };
    const end = async () => {
        const ready = gesture?.locked && distance >= REFRESH_THRESHOLD && canStart() && !busy;
        reset();
        if (!ready) return;
        busy = true;
        try { await onRefresh(); }
        catch (error) { if (!disposed) onError(error); }
        finally { busy = false; }
    };
    element.addEventListener('touchstart', start, { passive: true });
    element.addEventListener('touchmove', move, { passive: false });
    element.addEventListener('touchend', end);
    element.addEventListener('touchcancel', reset);
    return () => {
        disposed = true;
        gesture = null;
        element.removeEventListener('touchstart', start);
        element.removeEventListener('touchmove', move);
        element.removeEventListener('touchend', end);
        element.removeEventListener('touchcancel', reset);
    };
}
