import React, { useState, useEffect } from 'react';
import BottomSheet from './BottomSheet';
import DayInput from './DayInput';
import { Coffee, Car, ShoppingBag, Grid, Home as HomeIcon } from 'lucide-react';

const CATEGORIES = [
    { name: 'Food', icon: <Coffee size={20} /> },
    { name: 'Transport', icon: <Car size={20} /> },
    { name: 'Shopping', icon: <ShoppingBag size={20} /> },
    { name: 'Housing', icon: <HomeIcon size={20} /> }
];

export default function EditRecurringSheet({ isOpen, onClose, item, onSave }) {
    const [amount, setAmount] = useState('');
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [dueDate, setDueDate] = useState('1');

    useEffect(() => {
        if (isOpen && item) {
            setAmount(item.amount || '');
            setTitle(item.title || '');
            setCategory(item.category || 'General');
            setDueDate(item.dueDate ? String(item.dueDate) : '1');
        }
    }, [isOpen, item]);

    const handleSave = () => {
        onSave({
            amount: parseFloat(amount),
            title: title.trim(),
            category: category,
            dueDate: parseInt(dueDate, 10) || 1
        });
        onClose();
    };

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Edit Scheduled Payment">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="form-field" style={{ flex: 1 }}>
                        <div className="form-label">Amount (₹)</div>
                        <input
                            type="number"
                            className="form-input"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            style={{ fontSize: '18px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}
                        />
                    </div>
                    <div className="form-field" style={{ flex: 2 }}>
                        <div className="form-label">Payment Name</div>
                        <input
                            type="text"
                            className="form-input"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            style={{ fontSize: '16px', fontWeight: 500 }}
                        />
                    </div>
                </div>

                <div className="form-field">
                    <div className="form-label">Category</div>
                    <div className="categories-row">
                        {CATEGORIES.map(c => (
                            <div
                                key={c.name}
                                className={`cat-btn ${category === c.name ? 'selected' : ''}`}
                                onClick={() => setCategory(category === c.name ? 'General' : c.name)}
                            >
                                <span className="cat-icon">{c.icon}</span>
                                <span className="cat-label">{c.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <DayInput value={dueDate} onChange={setDueDate} />

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
