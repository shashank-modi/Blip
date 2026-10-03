import test from 'node:test';
import assert from 'node:assert/strict';
import { countryHint, phoneNumber } from '../src/utils/phone.js';
test('phone region uses saved choice, existing phone, then device hints', () => {
    assert.equal(countryHint({saved:'GB',phone:'+9779841234567',timeZone:'Asia/Kathmandu'}), 'GB');
    assert.equal(countryHint({phone:'+9779841234567',languages:['en-US']}), 'NP');
    assert.equal(countryHint({timeZone:'Asia/Katmandu',languages:['en-US']}), 'NP');
    assert.equal(countryHint({timeZone:'Asia/Calcutta'}), 'IN');
    assert.equal(countryHint({languages:['invalid_locale','en-AU']}), 'AU');
    assert.equal(countryHint({saved:'XX',languages:['en']}), 'IN');
});
test('contact numbers normalize country codes and local trunk prefixes', () => {
    assert.equal(phoneNumber('+977 984-123-4567','IN'), '+9779841234567');
    assert.equal(phoneNumber('07911 123456','GB'), '+447911123456');
    assert.equal(phoneNumber('garbage','NP'), null);
});
