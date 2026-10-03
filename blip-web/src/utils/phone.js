import { getCountries, parsePhoneNumberFromString } from 'libphonenumber-js';
export function phoneNumber(value, country = 'IN') {
    const parsed = parsePhoneNumberFromString(value || '', country);
    return parsed?.isValid() ? parsed.number : null;
}

// Region hints avoid requesting precise GPS location just to choose a calling code.
export function countryHint({ saved, phone, languages = [], timeZone = '' } = {}) {
    const known = new Set(getCountries());
    if (known.has(saved)) return saved;
    const fromPhone = parsePhoneNumberFromString(phone || '')?.country;
    if (fromPhone) return fromPhone;
    const zones = { 'Asia/Kathmandu':'NP', 'Asia/Katmandu':'NP', 'Asia/Kolkata':'IN', 'Asia/Calcutta':'IN', 'Asia/Dhaka':'BD', 'Asia/Karachi':'PK', 'Asia/Colombo':'LK', 'Asia/Dubai':'AE', 'Asia/Singapore':'SG', 'Asia/Tokyo':'JP', 'Europe/London':'GB' };
    if (zones[timeZone]) return zones[timeZone];
    for (const language of languages) {
        try { const region = new Intl.Locale(language).region; if (known.has(region)) return region; } catch { /* Ignore malformed browser locales. */ }
    }
    return 'IN';
}
export function defaultPhoneCountry(phone = '') {
    let saved;
    try { saved = localStorage.getItem('blip_phone_country'); } catch { /* Storage is optional. */ }
    return countryHint({ saved, phone, languages: globalThis.navigator?.languages || [], timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
}
export function rememberPhoneCountry(country) {
    try { localStorage.setItem('blip_phone_country', country); } catch { /* Storage is optional. */ }
}
