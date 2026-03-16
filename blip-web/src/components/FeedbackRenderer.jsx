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
            {/* Full-screen money flow — expense added / income added */}
            <MoneyFlowOverlay
                active={flowAnim.show}
                type={flowAnim.type}
                amount={flowAnim.amount}
                onComplete={dismissFlow}
            />

            {/* Full-screen celebration — recurring paid / investment added / shopping bought */}
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