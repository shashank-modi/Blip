import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
export default function SaveFeedback({ show, amount, title, detail, onDone }) {
    const done=useRef(onDone);
    done.current=onDone;
    useEffect(()=>{
        if(!show)return;
        const timer=setTimeout(()=>done.current?.(),1400);
        return ()=>clearTimeout(timer);
    },[show,amount,title,detail]);
    if(!show)return null;
    return <div className="save-feedback" role="status"><span className="save-feedback-icon"><Check size={19} strokeWidth={2.5}/></span><div><strong>{title}</strong><small>{detail ? `${detail} · ` : ''}Rs. {Number(amount).toLocaleString('en-IN',{maximumFractionDigits:2})}</small></div></div>;
}
