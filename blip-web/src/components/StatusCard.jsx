import { motion } from 'framer-motion';
import { Repeat, Lightbulb, Sparkles } from 'lucide-react';

function StatusCard({
    title = "Pro Tip",
    text,
    icon: Icon = Lightbulb,
    accent = "#c9f158",
    style = {}
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            style={{
                background: '#ffffff',
                borderRadius: 28,
                padding: '28px 32px',
                marginBottom: 24,
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid #e5e7eb',
                boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                ...style
            }}
        >
            {/* Background Decorative Icon */}
            <div style={{
                position: 'absolute',
                right: -30,
                bottom: -30,
                opacity: 0.15, // Reduced slightly for better text legibility
                color: accent,
                pointerEvents: 'none',
                transform: 'rotate(-15deg)'
            }}>
                <Icon size={180} strokeWidth={1} />
            </div>

            <div style={{ maxWidth: '85%', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: accent,
                        boxShadow: `0 0 10px ${accent}99`
                    }} />
                    <span style={{
                        fontSize: 11, fontWeight: 900,
                        color: 'rgba(32, 32, 32, 0.4)',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        fontFamily: "'Montserrat', sans-serif"
                    }}>
                        {title}
                    </span>
                </div>
                <div style={{
                    fontSize: '13px', fontWeight: 600,
                    color: '#202020', lineHeight: 1.6,
                    fontFamily: "'Montserrat', sans-serif"
                }}>
                    {text}
                </div>
            </div>
        </motion.div>
    );
}

export default StatusCard;