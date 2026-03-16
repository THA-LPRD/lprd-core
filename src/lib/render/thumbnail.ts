import { type Browser, chromium } from 'playwright';

export { getVariantPixelSize } from '@/lib/render/constants';

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
    if (!browser || !browser.isConnected()) {
        browser = await chromium.launch({ headless: true });
    }
    return browser;
}

export interface ScreenshotOptions {
    /** URL path to navigate to (e.g. `/org/slug/devices/render/id`) */
    renderPath: string;
    width: number;
    height: number;
    origin: string;
    /** CSS selector to wait for before screenshotting. Defaults to `[data-rendered]`. */
    waitForSelector?: string;
}

/**
 * Generate a screenshot by navigating Playwright to a render page.
 * Authenticates with the internal service token via Authorization header.
 * Single rendering function for all screenshot needs (devices, frames, templates).
 */
export async function generateScreenshot(options: ScreenshotOptions): Promise<ArrayBuffer> {
    const { renderPath, width, height, origin, waitForSelector = '[data-rendered]' } = options;

    const serviceToken = process.env.INTERNAL_SERVICE_TOKEN;
    if (!serviceToken) throw new Error('INTERNAL_SERVICE_TOKEN is required for internal rendering');

    const b = await getBrowser();
    const context = await b.newContext({
        viewport: { width, height },
        extraHTTPHeaders: {
            authorization: `Bearer internal:${serviceToken}`,
        },
    });

    const page = await context.newPage();
    await page.goto(`${origin}${renderPath}`);
    await page.waitForSelector(waitForSelector, { timeout: 10000 });

    const png = await page.screenshot({ type: 'png' });
    await page.close();
    await context.close();

    return png.buffer as ArrayBuffer;
}
