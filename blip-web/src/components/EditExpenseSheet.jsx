import React, { useState, useEffect } from 'react';
import BottomSheet from './BottomSheet';
import { Coffee, Car, ShoppingBag, Grid, Home as HomeIcon, Clapperboard, Hospital, Receipt, BookHeart } from 'lucide-react';

const catMap = [
    { name: 'Food', icon: <Coffee size={20} /> },
    { name: 'Transport', icon: <Car size={20} /> },
    { name: 'Shopping', icon: <ShoppingBag size={20} /> },
    { name: 'Housing', icon: <HomeIcon size={20} /> },
    { name: 'Entertainment', icon: <Clapperboard size={20} /> },
    { name: 'Medical', icon: <Hospital size={20} /> },
    { name: 'Bills', icon: <Receipt size={20} /> },
    { name: 'Personal Care', icon: <BookHeart size={20} /> }
];

const catBtnStyle = {
        flexShrink: 0,
        width: '92px',
        height: '72px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        borderRadius: '16px',
        transition: 'all 0.2s ease',
    };

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
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px', 
                paddingBottom: '20px'
            }}>

                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap', // THE KEY FIX
                    gap: '16px'
                }}>
                    <div className="form-field" style={{ flex: '1 1 120px' }}>
                        <div className="form-label">Amount (₹)</div>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="0"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            style={{
                                width: '100%',
                                fontSize: '18px',
                                fontFamily: 'Montserrat, sans-serif',
                                fontWeight: 700,
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                    <div className="form-field" style={{ flex: '1 1 200px' }}>
                        <div className="form-label">Description</div>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="What was this for?"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            style={{
                                width: '100%',
                                fontSize: '16px',
                                fontWeight: 500,
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                </div>


                <div className="form-field" >
                    <div className="form-label">Date</div>
                    <input
                        type="date"
                        className="form-input"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        style={{
                            boxSizing: 'border-box',
                            minHeight: '48px'
                        }}
                    />
                </div>

                <div className="form-field">
                    <div className="form-label">Category</div>
                    <div 
                        className="categories-row" 
                        style={{ 
                            display: 'flex', 
                            overflowX: 'auto', 
                            padding: '12px 0',
                            paddingBottom: '8px', 
                            gap: '8px',
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none' 
                        }}
                    >
                        <style>{`.categories-row::-webkit-scrollbar { display: none; }`}</style>   
                        {catMap.map(c => (
                            <div
                                key={c.name}
                                className={`cat-btn ${category === c.name ? 'selected' : ''}`}
                                onClick={() => setCategory(category === c.name ? 'General' : c.name)}
                                style={catBtnStyle}
                            >
                                <span className="cat-icon">{c.icon}</span>
                                <span className="cat-label" style={{ fontSize: '10px', fontWeight: '700' }}>
                                    {c.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    className="overlay-submit"
                    onClick={handleSave}
                    disabled={!amount || !description}
                    style={{
                        width: '100%',
                        opacity: (!amount || !description) ? 0.45 : 1,
                        marginTop: '12px',
                        padding: '16px',
                        borderRadius: '12px',
                        fontWeight: 700
                    }}
                >
                    Save Changes
                </button>
            </div>
        </BottomSheet>
    );
}