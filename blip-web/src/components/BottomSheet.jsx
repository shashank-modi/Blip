import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
export default function BottomSheet({ isOpen, onClose, title, children }) {
    const panel = useRef(null);
    const close = useRef(onClose);
    close.current = onClose;
    const titleId = useId();
    useEffect(() => {
        if (!isOpen) return;
        const previous = document.activeElement;
        const sheet = panel.current;
        const focusable = () => [...sheet.querySelectorAll('button, input, select, textarea, [tabindex="0"], a[href]')].filter(el => !el.disabled && el.getClientRects().length);
        const timer = setTimeout(() => { (sheet.querySelector('[autofocus], [data-autofocus]') || focusable()[0] || sheet)?.focus(); }, 0);
        const handleKey = event => {
            if ([...document.querySelectorAll('[data-blip-dialog]')].at(-1) !== sheet) return;
            if (event.key === 'Escape') { event.stopPropagation(); close.current(); }
            if (event.key === 'Tab') {
                const items = focusable(), first = items[0], last = items.at(-1);
                if (!first) { event.preventDefault(); sheet.focus(); }
                else if (event.shiftKey && (document.activeElement === first || !sheet.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && (document.activeElement === last || !sheet.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
            }
        };
        document.addEventListener('keydown', handleKey);
        return () => { clearTimeout(timer); document.removeEventListener('keydown', handleKey); if (previous?.isConnected) previous.focus(); };
    }, [isOpen]);
    if (!isOpen) return null;
    return createPortal(<div className="overlay-backdrop show" onClick={onClose}>
        <div ref={panel} data-blip-dialog role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} aria-label={title ? undefined : 'Details'} tabIndex={-1} className="overlay-sheet show" onClick={e => e.stopPropagation()}>
            <div className="overlay-handle" />
            <div className="sheet-heading"><h2 id={titleId} className="overlay-title">{title}</h2><button type="button" className="sheet-close" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>
            <div className="sheet-body">{children}</div>
        </div>
    </div>, document.body);
}
