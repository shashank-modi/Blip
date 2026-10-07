import { useRef, useState } from 'react';
import { CalendarDays, ChevronDown, Grid } from 'lucide-react';
import { parseExpenseInput } from '../utils/expenseInput.js';
import { buildExpenseDraft } from '../utils/expenseDraft.js';
import { expenseCategories } from '../utils/categories.js';

const money = amount => amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function ExpenseComposer({ history, category, date, dateLabel, onCategory, onDate, onSave, onSaved }) {
    const [input, setInput] = useState('');
    const [mode, setMode] = useState('separate');
    const [name, setName] = useState('');
    const [edits, setEdits] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const busy = useRef(false);
    const pending = useRef(null);
    const parsed = parseExpenseInput(input);
    const draft = buildExpenseDraft(parsed, { edits, category, history, mode, name });
    const multiple = parsed.items.length > 1;
    const updateItem = (index, key, value) => setEdits(previous => ({ ...previous, [index]: { ...previous[index], [key]: value } }));

    const save = async () => {
        if (!draft.valid || busy.current) return;
        busy.current = true;
        setSaving(true); setSaveError('');
        try {
            const fingerprint = JSON.stringify({ entries: draft.entries, date });
            if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint, requestId: crypto.randomUUID() };
            const success = await onSave(draft.entries, pending.current.requestId);
            if (!success) { setSaveError('Could not save. Your entries are still here; retry to finish saving.'); return; }
            setInput(''); setEdits({}); setMode('separate'); setName('');
            pending.current = null;
            onSaved();
        } catch {
            setSaveError('Could not save. Your entries are still here; retry to finish saving.');
        } finally { busy.current = false; setSaving(false); }
    };

    return <div className="log-card expense-composer" id="tour-nlp">
        <span className="eyebrow">A LITTLE SOMETHING TO LOG</span>
        <fieldset disabled={saving}>
            <label className="expense-input-label" htmlFor="wallet-expense-input">What did you spend?</label>
            <textarea id="wallet-expense-input" className="expense-text-input" rows={2} value={input} maxLength={12000}
                placeholder="40 bread, 100 tea, 200 pizza, 20 cookie"
                aria-describedby="expense-input-help" aria-invalid={parsed.errors.length > 0}
                onChange={event => { setInput(event.target.value); setEdits({}); setSaveError(''); }}
                onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void save(); } }}/>
            <p id="expense-input-help" className="field-help">Separate items with commas or new lines. For one total, try <span>40 + 100 + 200 + 20 snacks</span>.</p>
            {multiple && <div className="expense-save-modes" role="group" aria-label="How to save these expenses">
                <button type="button" aria-pressed={mode === 'separate'} onClick={() => setMode('separate')}>Separate expenses</button>
                <button type="button" aria-pressed={mode === 'combined'} onClick={() => setMode('combined')}>Combine into one</button>
            </div>}
            {draft.items.length > 0 && <div className="expense-draft">
                {draft.items.map((item, index) => <div className={`expense-draft-item${draft.combined ? ' expense-draft-combined' : ''}`} key={index}>
                    <label><span className="expense-input-label">Item {index + 1}</span><input aria-label={`Item ${index + 1} name`} maxLength={200} value={item.description} onChange={event => updateItem(index, 'description', event.target.value)}/></label>
                    <label><span className="expense-input-label">Rs.</span><input aria-label={`Item ${index + 1} amount`} inputMode="decimal" value={item.amount} onChange={event => updateItem(index, 'amount', event.target.value)}/></label>
                    {!draft.combined && <label className="expense-item-category"><span className="expense-input-label">Category</span><select aria-label={`Item ${index + 1} category`} value={item.category} onChange={event => updateItem(index, 'category', event.target.value)}>
                        {[...new Set([...expenseCategories, item.category])].map(option => <option key={option}>{option}</option>)}
                    </select></label>}
                    {parsed.items[index].calculation && edits[index]?.amount === undefined && <small className="expense-calculation">{parsed.items[index].calculation} = {money(parsed.items[index].amount)}</small>}
                </div>)}
                <div className="expense-draft-total" aria-live="polite"><span>{draft.items.length === 1 ? 'Total' : `${draft.items.length} items · Total`}</span><strong>Rs. {money(draft.total)}</strong></div>
            </div>}
            {draft.combined && <label className="expense-combined-name"><span className="expense-input-label">Save under one name</span><input value={name} maxLength={200} placeholder="e.g. Evening snacks" onChange={event => setName(event.target.value)}/><small>One category applies to the total. Item details are not stored separately.</small></label>}
            {parsed.errors.length > 0 && <div className="form-error" role="status">{parsed.errors.map(error => <p key={error}>{error}</p>)}</div>}
            {draft.error && <p className="form-error" role="status">{draft.error}</p>}
            <div className="expense-options"><button type="button" onClick={onCategory} aria-haspopup="dialog" aria-label="Choose expense category"><Grid size={18}/><span><small>{multiple && !draft.combined ? 'Default category' : category ? 'Category' : 'Auto category'}</small>{category || (draft.combined ? draft.entries[0].category : multiple ? 'Per item' : draft.items[0]?.category || 'Automatic')}</span><ChevronDown size={15}/></button></div>
            <div className="expense-submit-row"><button type="button" className="compact-calendar" onClick={onDate} aria-haspopup="dialog" aria-label={`Expense date: ${dateLabel}`}><CalendarDays size={20}/><span>{dateLabel}</span></button><button type="button" className="log-btn" onClick={() => void save()} disabled={saving || !draft.valid}>{saving ? 'Saving…' : draft.combined ? `Add one · Rs. ${money(draft.total)}` : multiple ? `Add ${draft.items.length} expenses` : 'Add expense'}</button></div>
        </fieldset>
        {saveError && <p className="form-error" role="alert">{saveError}</p>}
    </div>;
}
