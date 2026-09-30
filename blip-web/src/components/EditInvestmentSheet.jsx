import React, { useState, useEffect } from 'react';
import BottomSheet from './BottomSheet';
import DayInput from './DayInput';

export default function EditInvestmentSheet({ isOpen, onClose, investment, onSave }) {
    const [amount, setAmount] = useState('');
    const [title, setTitle] = useState('');
    const [sipDate, setSipDate] = useState('1');

    useEffect(() => {
        if (isOpen && investment) {
            setAmount(investment.amount || '');
            setTitle(investment.title || '');
            setSipDate(investment.sip_date ? String(investment.sip_date) : '1');
        }
    }, [isOpen, investment]);

    const handleSave = () => {
        const payload = {
            amount: parseFloat(amount),
            title: title.trim()
        };
        if (investment?.type === 'Monthly') {
            payload.sip_date = parseInt(sipDate, 10) || 1;
        }
        onSave(payload);
        onClose();
    };

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Edit Investment">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="form-field" style={{ flex: 1 }}>
                        <div className="form-label">Amount (Rs. )</div>
                        <input
                            type="number"
                            className="form-input"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            style={{ fontSize: '18px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}
                        />
                    </div>
                    <div className="form-field" style={{ flex: 2 }}>
                        <div className="form-label">Investment Name</div>
                        <input
                            type="text"
                            className="form-input"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            style={{ fontSize: '16px', fontWeight: 500 }}
                        />
                    </div>
                </div>

                {investment?.type === 'Monthly' && (
                    <DayInput value={sipDate} onChange={setSipDate} />
                )}

                <button
                    className="overlay-submit"
                    onClick={handleSave}
                    disabled={!amount || !title}
                    style={{ opacity: (!amount || !title) ? 0.45 : 1, marginTop: '8px' }}
                >
                    Save Changes
                </button>
            </div>
        </BottomSheet>
    );
}
