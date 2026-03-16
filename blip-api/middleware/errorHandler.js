export const errorHandler = (err, req, res, next) => {
    console.error('API Error:', err.message || err);

    // Catch Clerk Unauthenticated errors specifically if needed
    if (err.message && err.message.toLowerCase().includes('unauthenticated')) {
        return res.status(401).json({ error: 'Unauthenticated' });
    }

    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
};
