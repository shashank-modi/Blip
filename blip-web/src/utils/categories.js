// Match whole words/phrases, not substrings (e.g. "cab" in "cable").
export const expenseCategories = ['Food', 'Transport', 'Shopping', 'Housing', 'Entertainment', 'Medical', 'Bills', 'Personal Care', 'General'];
const rules = [
    ['Food', 'food|meal|meals|breakfast|lunch|dinner|brunch|snack|snacks|restaurant|cafe|coffee|tea|chai|chiya|juice|milk|bread|eggs|rice|vegetables|fruit|fruits|groceries|grocery|supermarket|pizza|burger|burgers|sandwich|sandwiches|momo|momos|m mo|momos platter|chowmein|chow mein|noodles|thukpa|sekuwa|khaja|dal bhat|daal bhat|biryani|dosa|idli|samosa|pani puri|panipuri|chatpate|pasta|chicken|ice cream|bakery|cake|cakes|chocolate|chocolates|biscuit|biscuits|cookies|chips|paneer|roti|paratha|dal|daal|yogurt|curd|sushi|ramen|beer|wine|drinks|water bottle|bottled water|zomato|swiggy|blinkit|zepto|instamart|bhatbhateni|bhat bhateni|foodmandu|bhoj|kfc|mcdonalds|starbucks'],
    ['Transport', 'transport|taxi|taxis|cab|cabs|uber|ola|rapido|pathao|in drive|indrive|tootle|rickshaw|auto rickshaw|bus|metro|train|flight|flights|airfare|petrol|diesel|fuel|parking|toll|tolls|fare|ride|travel|air ticket|bus ticket|train ticket|rental car|scooter repair|bike repair|car repair|car service|irctc|yeti airlines|buddha air'],
    ['Shopping', 'shopping|clothes|clothing|shirt|shirts|t shirt|jeans|dress|shoes|sneakers|jacket|socks|bag|bags|purse|watch|laptop|cable|headphones|earphones|charger|phone case|mobile phone|new phone|iphone|samsung|electronics|furniture|book|books|stationery|gift|gifts|amazon|flipkart|myntra|ajio|meesho|nykaa|daraz'],
    ['Housing', 'rent|house rent|room rent|apartment|hotel|hostel|airbnb|lodging|accommodation|plumber|plumbing|electrician|house repair|home repair|furnishing'],
    ['Entertainment', 'entertainment|movie|movies|cinema|concert|concerts|netflix|spotify|amazon prime|prime video|hotstar|disney plus|youtube premium|apple music|pvr|inox|qfx|game|games|gaming|steam|playstation|bowling|arcade|amusement park'],
    ['Medical', 'medicine|medicines|medication|doctor|doctors|dawai|ausadhi|pharmacy|hospital|clinic|dentist|dental|checkup|check up|blood test|lab test|medical|chemist|vitamins|paracetamol|prescription|therapy|physiotherapy'],
    ['Bills', 'bill|bills|electricity|electric|wifi|wi fi|internet|broadband|phone bill|mobile bill|recharge|data pack|mobile data|water bill|gas bill|gas cylinder|cooking gas|lpg|maintenance|insurance|school fees|tuition|subscription|ncell|ntc|nepal telecom|worldlink|vianet|dishhome|airtel|jio'],
    ['Personal Care', 'haircut|hair cut|barber|salon|spa|skincare|skin care|cosmetics|shampoo|soap|toothpaste|gym|yoga|fitness|manicure|pedicure|laundry|dry cleaning'],
].map(([category, phrases]) => ({ category, phrases: phrases.split('|') }));

export function normalizeDescription(text = '') {
    return String(text).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

export function suggestCategory(description, history = []) {
    const normalized = normalizeDescription(description);
    if (!normalized) return null;
    // An exact previous description carries the user's corrections and custom categories.
    const previous = history.filter(expense => expense.category && !['Income', 'Social', 'General'].includes(expense.category) && normalizeDescription(expense.description) === normalized)
        .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0))[0];
    if (previous) return previous.category;
    const padded = ` ${normalized} `;
    const ranked = rules.map(({ category, phrases }) => ({ category, score: phrases.reduce((score, phrase) => {
        // A specific phrase should outweigh generic words such as "bill" or "amazon".
        if (!padded.includes(` ${phrase} `)) return score;
        const weight = ['bill', 'bills', 'subscription'].includes(phrase) ? 0.25 : 1;
        return score + (phrase.includes(' ') ? 5 + phrase.split(' ').length : weight);
    }, 0) })).sort((a, b) => b.score - a.score);
    return ranked[0].score > 0 ? ranked[0].category : null;
}
