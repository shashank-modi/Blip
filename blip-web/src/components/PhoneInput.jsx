import { useEffect, useRef, useState } from 'react';
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js';
import { Check, ChevronDown, Search } from 'lucide-react';
import BottomSheet from './BottomSheet';
const names = new Intl.DisplayNames(['en'], { type: 'region' });
const countries = getCountries().sort((a, b) => names.of(a).localeCompare(names.of(b)));
const flag = country => [...country].map(letter => String.fromCodePoint(127397 + letter.charCodeAt(0))).join('');
export default function PhoneInput({ value = '', onChange, dark = false }) {
    const [country, setCountry] = useState(() => parsePhoneNumberFromString(value, 'IN')?.country || 'IN');
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const list = useRef(null);
    const code = getCountryCallingCode(country);
    useEffect(() => {
        if (value.startsWith('+') && !value.startsWith(`+${code}`)) {
            const parsed = parsePhoneNumberFromString(value);
            if (parsed?.country) setCountry(parsed.country);
        }
    }, [value, code]);
    const parsed = value.startsWith('+') ? parsePhoneNumberFromString(value) : null;
    const national = value.startsWith(`+${code}`) ? value.slice(code.length + 1) : parsed?.nationalNumber || value.replace(/\D/g, '');
    const matches = countries.filter(c => `${names.of(c)} ${c} +${getCountryCallingCode(c)}`.toLowerCase().includes(search.toLowerCase().trim()));
    return <>
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
        <BottomSheet isOpen={open} onClose={() => setOpen(false)} title="Choose your country">
            <p className="field-help">Search by country name or calling code.</p>
            <div className="search-field country-search"><Search size={18} /><input autoFocus data-autofocus aria-label="Search countries" placeholder="Search country or code" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); list.current?.querySelector('button')?.focus(); } }} /></div>
            <div className="country-options" ref={list}>
                {matches.map(c => <button type="button" className={`country-option${country === c ? ' selected' : ''}`} key={c} onClick={() => { setCountry(c); onChange(national ? `+${getCountryCallingCode(c)}${national}` : `+${getCountryCallingCode(c)}`); setOpen(false); }}>
                    <span aria-hidden="true" className="country-flag">{flag(c)}</span><span className="country-name">{names.of(c)}</span><span className="country-code">+{getCountryCallingCode(c)}</span>{country === c ? <Check size={18} /> : <span style={{width:18}} />}
                </button>)}
                {!matches.length && <p className="empty-note">No countries found. Try a different name or code.</p>}
            </div>
        </BottomSheet>
    </>;
}
