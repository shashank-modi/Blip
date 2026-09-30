export async function requestJson(url, options = {}, {
    getToken, fetchImpl = fetch, timeoutMs = 20000, retries = 2, retryDelayMs = 1000,
} = {}) {
    const readOnly = !options.method || options.method.toUpperCase() === 'GET';
    const controller = new AbortController();
    let timer;
    const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => {
            const error = new Error(readOnly
                ? 'The server took too long to respond. Check your connection and try again.'
                : 'The server took too long to respond. Check your activity before repeating this action.');
            error.code = 'REQUEST_TIMEOUT';
            controller.abort(error);
            reject(error);
        }, timeoutMs);
    });
    const perform = async () => {
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        const token = getToken ? await getToken() : null;
        if (token) headers.Authorization = `Bearer ${token}`;
        const attempts = readOnly ? retries + 1 : 1;
        for (let attempt = 0; attempt < attempts; attempt++) {
            if (controller.signal.aborted) throw controller.signal.reason;
            try {
                const response = await fetchImpl(url, { ...options, headers, signal: controller.signal });
                if ([502, 503, 504].includes(response.status) && attempt + 1 < attempts) {
                    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
                    continue;
                }
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const payload = isJson ? await response.json() : null;
                if (!response.ok) {
                    const error = new Error(payload?.error || (response.status === 401 ? 'Please sign in again.' : `The server could not complete the request (${response.status}).`));
                    error.status = response.status;
                    error.payload = payload;
                    throw error;
                }
                if (!isJson) throw new Error('The server returned an unexpected response. Please try again later.');
                return payload;
            } catch (error) {
                if (controller.signal.aborted) throw controller.signal.reason;
                const networkError = error instanceof TypeError || error.code === 'ECONNREFUSED';
                if (!networkError) throw error;
                if (attempt + 1 === attempts) throw new Error('Could not reach the server. Check your connection and try again.');
                await new Promise(resolve => setTimeout(resolve, retryDelayMs));
            }
        }
    };
    try { return await Promise.race([perform(), deadline]); }
    finally { clearTimeout(timer); }
}
