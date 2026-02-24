import http from 'http';
import https from 'https';
import { HEALTHCHECK_REQUEST_TIMEOUT_MS, HEALTHCHECK_TIMEOUT_MS, HEALTHCHECK_INTERVAL_MS } from './constants';

export function normalizeOrigin(input: string): string | null {
    try {
        return new URL(input).origin.toLowerCase();
    } catch {
        return null;
    }
}

export function buildAllowedOrigins(targetUrl: string): Set<string> {
    const parsed = new URL(targetUrl);
    const allowed = new Set<string>([parsed.origin.toLowerCase()]);

    if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
        const portSuffix = parsed.port ? `:${parsed.port}` : '';
        allowed.add(`${parsed.protocol}//127.0.0.1${portSuffix}`.toLowerCase());
        allowed.add(`${parsed.protocol}//localhost${portSuffix}`.toLowerCase());
    }

    return allowed;
}

export function isUiOriginAllowed(origin: string, allowedOrigins: Set<string>): boolean {
    const normalized = normalizeOrigin(origin);
    if (!normalized) {
        return false;
    }
    return allowedOrigins.has(normalized);
}

export async function requestBackend<T>(uiUrl: string | null, apiPath: string, init: RequestInit = {}): Promise<T> {
    if (!uiUrl) {
        throw new Error('Ghost Runner backend URL is not initialized.');
    }

    const headers = new Headers(init.headers);
    if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const requestUrl = new URL(apiPath, uiUrl).toString();
    const response = await fetch(requestUrl, { ...init, headers });
    const responseText = await response.text();

    let payload: unknown = null;
    if (responseText) {
        try {
            payload = JSON.parse(responseText) as unknown;
        } catch {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }
            throw new Error(`Invalid JSON response from ${requestUrl}`);
        }
    }

    if (!response.ok) {
        if (payload && typeof payload === 'object' && 'error' in payload) {
            const errorValue = (payload as { error?: unknown }).error;
            if (typeof errorValue === 'string' && errorValue.trim()) {
                throw new Error(errorValue);
            }
        }
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    return (payload ?? {}) as T;
}

export function resolveRequestModule(protocol: string): typeof http | typeof https {
    if (protocol === 'https:') {
        return https;
    }
    return http;
}

export function probeUrlStatus(url: URL): Promise<number | null> {
    return new Promise((resolve) => {
        const transport = resolveRequestModule(url.protocol);
        const req = transport.request(
            {
                protocol: url.protocol,
                hostname: url.hostname,
                port: url.port,
                path: `${url.pathname}${url.search}`,
                method: 'GET',
                timeout: HEALTHCHECK_REQUEST_TIMEOUT_MS,
            },
            (res) => {
                res.resume();
                resolve(res.statusCode ?? null);
            }
        );

        req.on('timeout', () => {
            req.destroy();
            resolve(null);
        });

        req.on('error', () => {
            resolve(null);
        });

        req.end();
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export async function waitForServerHealth(baseUrl: string): Promise<void> {
    const startedAt = Date.now();
    const timeoutAt = startedAt + HEALTHCHECK_TIMEOUT_MS;
    const endpoints = [new URL('/health', baseUrl), new URL('/api/health', baseUrl)];

    while (Date.now() < timeoutAt) {
        for (const endpoint of endpoints) {
            const status = await probeUrlStatus(endpoint);
            if (status !== null && status >= 200 && status < 300) {
                return;
            }
        }

        await sleep(HEALTHCHECK_INTERVAL_MS);
    }

    throw new Error(
        `Backend health check timed out after ${HEALTHCHECK_TIMEOUT_MS}ms for ${baseUrl}`
    );
}
