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
    origin: string;
    /** Initial viewport used only to load and measure the render target. */
    width?: number;
    height?: number;
    /** CSS selector to wait for before screenshotting. Defaults to `[data-rendered]`. */
    waitForSelector?: string;
    /** CSS selector to screenshot instead of the full page. */
    screenshotSelector?: string;
}

/**
 * Generate a screenshot by navigating Playwright to a render page.
 * Authenticates with a WorkOS M2M access token via Authorization header.
 * Single rendering function for all screenshot needs (devices, frames, templates).
 */
export async function generateScreenshot(options: ScreenshotOptions): Promise<ArrayBuffer> {
    const { renderPath, width, height, origin, waitForSelector = '[data-rendered]', screenshotSelector } = options;
    const serviceToken = await getInternalAccessToken();

    const b = await getBrowser();
    const viewport = width && height ? { width, height } : undefined;
    const context = await b.newContext({
        ...(viewport ? { viewport } : {}),
        extraHTTPHeaders: {
            authorization: `Bearer ${serviceToken}`,
        },
    });

    const page = await context.newPage();
    try {
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

        if (screenshotSelector) {
            const target = await page.waitForSelector(screenshotSelector, { timeout: 10000 });
            const box = await target.evaluate((el) => {
                const rect = el.getBoundingClientRect();
                return {
                    width: Math.ceil(Math.max(rect.width, el.scrollWidth)),
                    height: Math.ceil(Math.max(rect.height, el.scrollHeight)),
                };
            });

            if (box.width <= 0 || box.height <= 0) {
                throw new Error(`Screenshot target '${screenshotSelector}' has no renderable size on ${renderPath}`);
            }

            await page.setViewportSize({ width: box.width, height: box.height });
            const png = await target.screenshot({ type: 'png' });
            return Uint8Array.from(png).buffer;
        }

        const png = await page.screenshot({ type: 'png' });
        return Uint8Array.from(png).buffer;
    } finally {
        await context.close();
    }
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
