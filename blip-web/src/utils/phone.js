import { parsePhoneNumberFromString } from 'libphonenumber-js';
export function phoneNumber(value, country = 'IN') {
    const parsed = parsePhoneNumberFromString(value || '', country);
    return parsed?.isValid() ? parsed.number : null;
}
