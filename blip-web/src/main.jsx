import { registerServiceWorker } from './lib/pwa';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import './index.css';
import './polish.css';
import App from './App.jsx';
import { AppProvider } from './store/AppContext.jsx';

registerServiceWorker().catch(() => console.warn('Offline loading and device notifications could not be registered.'));

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

createRoot(document.getElementById('root')).render(
    <ClerkProvider publishableKey={publishableKey}>
        <AppProvider>
            <App />
        </AppProvider>
    </ClerkProvider>
);
