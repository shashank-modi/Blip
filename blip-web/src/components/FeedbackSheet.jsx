import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import BottomSheet from './BottomSheet';

export default function FeedbackSheet({ isOpen, onClose }) {
    const [loading, setLoading] = useState(true);

    const googleFormUrl = "https://docs.google.com/forms/d/e/1FAIpQLSd_vrgeKU5R31GQjZOm5b7wfRbdEDvpIa5JlP8S_8iggxa0PA/viewform?usp=publish-editor";

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="App Feedback">
            <div style={{
                position: 'relative',
                width: '100%',
                height: '75vh',
                marginTop: 10,
                borderRadius: '24px',
                overflow: 'hidden',
                background: '#ffffff',
                border: '1px solid #e5e7eb'
            }}>

                <AnimatePresence>
                    {loading && (
                        <motion.div
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                justifyContent: 'center', background: '#ffffff', zIndex: 10,
                                gap: 16
                            }}
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            >
                                <Loader2 size={32} color="#202020" strokeWidth={2.5} />
                            </motion.div>
                            <div style={{
                                fontSize: 11, fontWeight: 800, color: 'var(--text-3)',
                                fontFamily: "'Montserrat', sans-serif", letterSpacing: '1px'
                            }}>
                                SYNCING FORM...
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <iframe
                    src={googleFormUrl}
                    onLoad={() => setLoading(false)}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    marginHeight="0"
                    marginWidth="0"
                    title="Feedback Form"
                    style={{
                        display: loading ? 'none' : 'block', // Hide until loaded to prevent "flash"
                    }}
                >
                    Loading…
                </iframe>
            </div>

            {/* ── 3. DISMISSAL TIP ── */}
            {!loading && (
                <div style={{
                    textAlign: 'center', padding: '16px 0', fontSize: 11,
                    color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.5px'
                }}>
                    TAP OUTSIDE TO RETURN TO BLIP.
                </div>
            )}
        </BottomSheet>
    );
}