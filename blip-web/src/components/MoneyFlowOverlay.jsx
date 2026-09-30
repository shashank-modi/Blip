import SaveFeedback from './SaveFeedback';
export default function MoneyFlowOverlay({ active, type, amount, onComplete }) {
    return <SaveFeedback show={active} amount={amount} title={type==='settlement'?'Payment recorded':type==='income'?'Money added':'Expense added'} onDone={onComplete}/>;
}
