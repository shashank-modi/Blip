import { ArrowLeft } from 'lucide-react';
export default function PageHeader({ title, subtitle, onBack, actions }) {
    return <header className="page-heading"><div className="page-heading-main">{onBack && <button className="back-button" onClick={onBack} aria-label="Back to Wallet"><ArrowLeft size={20} /></button>}<div><h1>{title}<span className="brand-dot">.</span></h1>{subtitle && <p>{subtitle}</p>}</div></div>{actions && <div className="page-actions">{actions}</div>}</header>;
}
