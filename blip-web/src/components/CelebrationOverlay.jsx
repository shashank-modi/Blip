import SaveFeedback from './SaveFeedback';
export default function CelebrationOverlay({ type, show, amount, label, onDone }) {
    return <SaveFeedback show={show} amount={amount} title={type==='paid'?'Payment recorded':type==='investment'?'Investment added':'Saved'} detail={label} onDone={onDone}/>;
}
