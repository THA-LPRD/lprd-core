import { type Browser, chromium } from 'playwright';
import { getToken } from '@/lib/workos/connect';

export { getVariantPixelSize } from '@/lib/render/constants';

let browser: Browser | null = null;
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getBrowser(): Promise<Browser> {
    if (!browser || !browser.isConnected()) {
        browser = await chromium.launch({ headless: true });
    }
    return browser;
}

export interface ScreenshotOptions {
    /** URL path to navigate to (e.g. `/site/slug/devices/render/id`) */
    renderPath: string;
    width: number;
    height: number;
    origin: string;
    /** CSS selector to wait for before screenshotting. Defaults to `[data-rendered]`. */
    waitForSelector?: string;
}

/**
 * Generate a screenshot by navigating Playwright to a render page.
 * Authenticates with a WorkOS M2M access token via Authorization header.
 * Single rendering function for all screenshot needs (devices, frames, templates).
 */
export async function generateScreenshot(options: ScreenshotOptions): Promise<ArrayBuffer> {
    const { renderPath, width, height, origin, waitForSelector = '[data-rendered]' } = options;
    const serviceToken = await getInternalAccessToken();

    const b = await getBrowser();
    const context = await b.newContext({
        viewport: { width, height },
        extraHTTPHeaders: {
            authorization: `Bearer ${serviceToken}`,
        },
    });

    const page = await context.newPage();
    const response = await page.goto(`${origin}${renderPath}`, { waitUntil: 'networkidle' });

    if (!response || !response.ok()) {
        const text = await page.content();
        throw new Error(
            `Render page failed: ${response?.status() ?? 'no-response'} ${response?.statusText() ?? ''} ${text.slice(0, 500)}`,
        );
    }

    try {
        await page.waitForSelector(waitForSelector, { timeout: 10000 });
    } catch {
        throw new Error(`Render marker '${waitForSelector}' not found on ${renderPath}: ${await page.content()}`);
    }

    const png = await page.screenshot({ type: 'png' });
    await page.close();
    await context.close();

    return png.buffer as ArrayBuffer;
}

async function getInternalAccessToken(): Promise<string> {
    const now = Date.now();
    if (cachedAccessToken && cachedAccessToken.expiresAt > now + 30_000) {
        return cachedAccessToken.token;
    }

    const clientId = process.env.WORKER_CLIENT_ID;
    const clientSecret = process.env.WORKER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('WORKER_CLIENT_ID and WORKER_CLIENT_SECRET are required');
    }

    const token = await getToken({
        clientId,
        clientSecret,
    });

    cachedAccessToken = {
        token: token.access_token,
        expiresAt: now + token.expires_in * 1000,
    };

    return token.access_token;
}
