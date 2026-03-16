import React, { useState, useEffect } from 'react';
import BottomSheet from './BottomSheet';
import { Coffee, Car, ShoppingBag, Grid, Home as HomeIcon } from 'lucide-react';

const CATEGORIES = [
    { name: 'Food', icon: <Coffee size={20} /> },
    { name: 'Transport', icon: <Car size={20} /> },
    { name: 'Shopping', icon: <ShoppingBag size={20} /> },
    { name: 'Housing', icon: <HomeIcon size={20} /> }
];

export default function EditExpenseSheet({ isOpen, onClose, expense, onSave }) {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState('');

    useEffect(() => {
        if (isOpen && expense) {
            setAmount(expense.amount || '');
            setDescription(expense.description || '');
            setCategory(expense.category || 'General');
            if (expense.date) {
                // Ensure format YYYY-MM-DD for date input
                const d = new Date(expense.date);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                setDate(`${year}-${month}-${day}`);
            } else {
                setDate('');
            }
        }
    }, [isOpen, expense]);

    const handleSave = () => {
        onSave({
            amount: parseFloat(amount),
            description: description.trim(),
            category: category,
            date: date ? new Date(date).toISOString() : undefined
        });
        onClose();
    };

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Edit Transaction">
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
                        <div className="form-label">Description</div>
                        <input
                            type="text"
                            className="form-input"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            style={{ fontSize: '16px', fontWeight: 500 }}
                        />
                    </div>
                </div>

                <div className="form-field">
                    <div className="form-label">Date</div>
                    <input
                        type="date"
                        className="form-input"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                    />
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

                <button
                    className="overlay-submit"
                    onClick={handleSave}
                    disabled={!amount || !description}
                    style={{ opacity: (!amount || !description) ? 0.45 : 1, marginTop: '8px' }}
                >
                    Save Changes
                </button>
            </div>
        </BottomSheet>
    );
}
