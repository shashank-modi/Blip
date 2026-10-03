export const groupCategories = [
    { id: 'general', label: 'General' },
    { id: 'home', label: 'Home' },
    { id: 'trip', label: 'Travel' },
    { id: 'meals', label: 'Meals' },
    { id: 'celebration', label: 'Celebrations' },
    { id: 'outdoors', label: 'Outdoors' },
    { id: 'commute', label: 'Transport' },
    { id: 'study', label: 'Study' },
    { id: 'work', label: 'Work' },
    { id: 'gaming', label: 'Gaming' },
    { id: 'fitness', label: 'Fitness' },
    { id: 'entertainment', label: 'Entertainment' },
];
const legacyIcons = { '🏖️':'trip', '🏖':'trip', '✈️':'trip', '✈':'trip', '🏔️':'trip', '🏔':'trip', '🏠':'home', '🍱':'meals', '🎉':'celebration', '🏕️':'outdoors', '🏕':'outdoors', '🛵':'commute', '🎓':'study', '💼':'work', '🎮':'gaming', '🏋️':'fitness', '🏋':'fitness', '🎬':'entertainment', '🏷️':'general', '👥':'general' };
const known = new Set(groupCategories.map(category => category.id));
export function groupCategory(icon, type = '') {
    if (known.has(icon)) return icon;
    if (Object.hasOwn(legacyIcons, icon)) return legacyIcons[icon];
    const normalized = typeof type === 'string' ? type.toLowerCase() : '';
    return known.has(normalized) ? normalized : 'general';
}
