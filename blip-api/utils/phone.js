import { parsePhoneNumberFromString } from 'libphonenumber-js';
export function normalizePhone(value) {
    if (typeof value !== 'string') throw Object.assign(new Error('Valid phone number required'), { status: 400 });
    // Existing accounts stored national Indian numbers without a calling code.
    const phone = parsePhoneNumberFromString(value, 'IN');
    if (!phone?.isValid()) throw Object.assign(new Error('Valid phone number required'), { status: 400 });
    return phone.number;
}
