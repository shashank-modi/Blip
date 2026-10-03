import { Users, House, Plane, UtensilsCrossed, PartyPopper, Tent, Bike, GraduationCap, BriefcaseBusiness, Gamepad2, Dumbbell, Clapperboard } from 'lucide-react';
import { groupCategories, groupCategory } from '../utils/groupCategory';
const icons = { general: Users, home: House, trip: Plane, meals: UtensilsCrossed, celebration: PartyPopper, outdoors: Tent, commute: Bike, study: GraduationCap, work: BriefcaseBusiness, gaming: Gamepad2, fitness: Dumbbell, entertainment: Clapperboard };
export default function GroupIcon({ icon, type, size = 22 }) {
    const Icon = icons[groupCategory(icon, type)];
    return <Icon size={size} strokeWidth={1.8} aria-hidden="true"/>;
}
export function GroupCategoryPicker({ value, onChange }) {
    return <div className="group-category-picker" aria-label="Group category">{groupCategories.map(category => <button type="button" key={category.id} aria-label={category.label} title={category.label} aria-pressed={groupCategory(value) === category.id} onClick={() => onChange(category.id)}><GroupIcon icon={category.id}/></button>)}</div>;
}
