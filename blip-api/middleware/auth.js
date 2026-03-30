import { requireAuth as clerkRequireAuth } from '@clerk/express';
export const requireAuth = clerkRequireAuth();

export const getUserId = (req) => {
    const auth = req.auth();
    return auth.userId || auth.sub;
};
