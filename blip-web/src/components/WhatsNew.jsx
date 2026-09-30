import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X, Sparkles } from 'lucide-react';

// ── THE UPDATES DATA ──
const UPDATES = [
    { id: 1, title: "Your circle, made simpler.", desc: "Clear actions to add friends and create groups. Separate bill names and amounts, with equal splits, exact amounts, or shares.", icon: "🤝", color: "#c9f158" },
    { id: 2, title: "Every share. Every settlement.", desc: "See trip totals and what each person paid. Settle a little or all at once, and follow every update in Activity.", icon: "🧾", color: "#e9efdb" },
    { id: 3, title: "More room for your money.", desc: "Meet the refreshed Wallet, dashboard, and transaction history — now designed for both your phone and desktop.", icon: "✨", color: "#e9efdb" },
];

export default function WhatsNew({ onClose }) {
    const [index, setIndex] = useState(0);
    const isLast = index === UPDATES.length - 1;

    const next = () => isLast ? onClose() : setIndex(p => p + 1);

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                style={{ background: '#ffffff', borderRadius: 32, width: '100%', maxWidth: 400, overflow: 'hidden', position: 'relative' }}
            >
                {/* Progress Bar */}
                <div style={{ display: 'flex', gap: 4, padding: '20px 24px 0' }}>
                    {UPDATES.map((_, i) => (
                        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= index ? '#202020' : '#f2f3f5', transition: 'all 0.3s' }} />
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        style={{ padding: '32px 24px' }}
                    >
                        <div style={{ width: 64, height: 64, borderRadius: 20, background: UPDATES[index].color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 24, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                            {UPDATES[index].icon}
                        </div>

                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Sparkles size={12} /> What’s new · 3.0.0
                        </div>

                        <h2 style={{ fontSize: 28, fontWeight: 900, color: '#202020', marginBottom: 12, lineHeight: 1.1 }}>
                            {UPDATES[index].title}
                        </h2>

                        <p style={{ fontSize: 15, color: 'var(--text-3)', lineHeight: 1.6, fontWeight: 500 }}>
                            {UPDATES[index].desc}
                        </p>
                    </motion.div>
                </AnimatePresence>

                <div style={{ padding: '0 24px 32px' }}>
                    <button
                        onClick={next}
                        style={{ width: '100%', padding: '18px', borderRadius: 18, border: 'none', background: '#202020', color: isLast ? '#c9f158' : '#ffffff', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
                    >
                        {isLast ? "Start using blip." : "Next Feature"}
                        {!isLast && <ChevronRight size={18} />}
                    </button>
                </div>

                {/* Optional Skip */}
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#202020', opacity: 0.3, cursor: 'pointer' }}
                >
                    <X size={20} />
                </button>
            </motion.div>
        </motion.div>
    );
}