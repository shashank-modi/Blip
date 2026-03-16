import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import './index.css';
import App from './App.jsx';
import { AppProvider } from './store/AppContext.jsx';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById('root')).render(
    <ClerkProvider publishableKey={publishableKey}>
        <AppProvider>
            <App />
        </AppProvider>
    </ClerkProvider>
);
