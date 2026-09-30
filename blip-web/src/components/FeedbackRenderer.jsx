import { useApp } from '../store/AppContext';
import CelebrationOverlay from './CelebrationOverlay';
import MoneyFlowOverlay from './MoneyFlowOverlay';

export default function FeedbackRenderer() {
    const {
        flowAnim, dismissFlow,
        celebration, dismissCelebration,
    } = useApp();

    return (
        <>
            {/* Brief confirmation after a successful save */}
            <MoneyFlowOverlay
                active={flowAnim.show}
                type={flowAnim.type}
                amount={flowAnim.amount}
                onComplete={dismissFlow}
            />

            {/* Confirmation for recurring payments and other saved entries */}
            <CelebrationOverlay
                show={celebration.show}
                type={celebration.type}
                amount={celebration.amount}
                label={celebration.label}
                onDone={dismissCelebration}
            />
        </>
    );
}