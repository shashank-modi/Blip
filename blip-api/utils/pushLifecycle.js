// Register background work before sending the response, so serverless hosts keep
// the invocation alive until committed notification deliveries finish.
export function pushAfterResponse(flush, extendLifetime) {
    return (req, res, next) => {
        if (req.method !== 'GET' || req.path === '/api/notifications') {
            const work = new Promise(resolve => {
                res.once('finish', () => resolve(res.statusCode < 400 ? Promise.resolve().then(flush) : undefined));
                res.once('close', () => resolve());
            }).catch(error => console.error('Push delivery task failed:', error?.code || 'unavailable'));
            extendLifetime?.(work);
        }
        next();
    };
}
