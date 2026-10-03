import { useEffect, useRef, useState } from 'react';
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js';
import { Check, ChevronDown, Search, Contact } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { defaultPhoneCountry, rememberPhoneCountry, phoneNumber } from '../utils/phone';
const names = new Intl.DisplayNames(['en'], { type: 'region' });
const countries = getCountries().sort((a, b) => names.of(a).localeCompare(names.of(b)));
const flag = country => [...country].map(letter => String.fromCodePoint(127397 + letter.charCodeAt(0))).join('');
export default function PhoneInput({ value = '', onChange, dark = false, countryPhone = '', contactLabel = 'Choose from contacts' }) {
    const [country, setCountry] = useState(() => parsePhoneNumberFromString(value)?.country || defaultPhoneCountry(countryPhone));
    const [contactNumbers, setContactNumbers] = useState([]);
    const [contactError, setContactError] = useState('');
    const [picking, setPicking] = useState(false);
    const canPick = window.isSecureContext && typeof navigator.contacts?.select === 'function';
    const pickContact = async () => {
        if (picking) return;
        setPicking(true); setContactError('');
        try {
            const contacts = await navigator.contacts.select(['tel'], { multiple: false });
            if (!contacts.length) return;
            const numbers = [...new Set((contacts[0].tel || []).map(number => phoneNumber(number, country)).filter(Boolean))];
            if (!numbers.length) setContactError('No valid phone number found. Enter the number below or check the country.');
            else if (numbers.length === 1) onChange(numbers[0]);
            else setContactNumbers(numbers);
        } catch (err) {
            if (err.name !== 'AbortError') setContactError('Contacts aren’t available here. You can paste or type the number instead.');
        } finally { setPicking(false); }
    };
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const list = useRef(null);
    const code = getCountryCallingCode(country);
    useEffect(() => {
        if (value.startsWith('+')) {
            const parsed = parsePhoneNumberFromString(value);
            if (parsed?.country && parsed.country !== country) setCountry(parsed.country);
        }
    }, [value]);
    const parsed = value.startsWith('+') ? parsePhoneNumberFromString(value) : null;
    const national = value.startsWith(`+${code}`) ? value.slice(code.length + 1) : parsed?.nationalNumber || value.replace(/\D/g, '');
    const matches = countries.filter(c => `${names.of(c)} ${c} +${getCountryCallingCode(c)}`.toLowerCase().includes(search.toLowerCase().trim()));
    return <>
        {canPick && <button type="button" className="button-secondary contact-pick" disabled={picking} onClick={pickContact}><Contact size={17}/>{picking ? 'Opening contacts…' : contactLabel}</button>}
        {contactError && <p className="field-help" role="status">{contactError}</p>}
        <div className={`phone-field${dark ? ' phone-field-dark' : ''}`}>
            <button type="button" className="phone-country" aria-label={`Country calling code: ${names.of(country)} +${code}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => { setSearch(''); setOpen(true); }}>
                <span aria-hidden="true" className="country-flag">{flag(country)}</span><span>+{code}</span><ChevronDown size={14} />
            </button>
            <input aria-label="Phone number" type="tel" inputMode="tel" autoComplete="tel-national" value={national} placeholder="Phone number" onChange={e => {
                const raw = e.target.value;
                if (raw.trim().startsWith('+')) {
                    const number = parsePhoneNumberFromString(raw);
                    if (number?.country) setCountry(number.country);
                    onChange('+' + raw.replace(/\D/g, ''));
                } else onChange(raw ? `+${code}${raw.replace(/\D/g, '')}` : '');
            }} />
        </div>
        <BottomSheet isOpen={contactNumbers.length > 0} onClose={() => setContactNumbers([])} title="Choose a phone number">
            <p className="field-help">This contact has more than one number.</p>
            {contactNumbers.map(number => <button type="button" className="country-option" key={number} onClick={() => { onChange(number); setContactNumbers([]); }}>{number}</button>)}
        </BottomSheet>
        <BottomSheet isOpen={open} onClose={() => setOpen(false)} title="Choose your country">
            <p className="field-help">Search by country name or calling code.</p>
            <div className="search-field country-search"><Search size={18} /><input autoFocus data-autofocus aria-label="Search countries" placeholder="Search country or code" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); list.current?.querySelector('button')?.focus(); } }} /></div>
            <div className="country-options" ref={list}>
                {matches.map(c => <button type="button" className={`country-option${country === c ? ' selected' : ''}`} key={c} onClick={() => { setCountry(c); rememberPhoneCountry(c); onChange(national ? `+${getCountryCallingCode(c)}${national}` : `+${getCountryCallingCode(c)}`); setOpen(false); }}>
                    <span aria-hidden="true" className="country-flag">{flag(c)}</span><span className="country-name">{names.of(c)}</span><span className="country-code">+{getCountryCallingCode(c)}</span>{country === c ? <Check size={18} /> : <span style={{width:18}} />}
                </button>)}
                {!matches.length && <p className="empty-note">No countries found. Try a different name or code.</p>}
            </div>
        </BottomSheet>
    </>;
}
