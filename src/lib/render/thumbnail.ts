import { type Browser, chromium } from 'playwright';

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
    if (!browser || !browser.isConnected()) {
        browser = await chromium.launch({ headless: true });
    }
    return browser;
}

export interface ThumbnailOptions {
    renderPath: string;
    width: number;
    height: number;
    cookieHeader?: string;
    origin: string;
    hostname: string;
    waitForSelector?: string;
}

export async function generateThumbnail(options: ThumbnailOptions): Promise<ArrayBuffer> {
    const {
        renderPath,
        width,
        height,
        cookieHeader = '',
        origin,
        hostname,
        waitForSelector = '[data-rendered]',
    } = options;

    const cookies = cookieHeader
        .split(';')
        .map((c) => {
            const [name, ...rest] = c.trim().split('=');
            return {
                name: name.trim(),
                value: rest.join('=').trim(),
                domain: hostname,
                path: '/',
            };
        })
        .filter((c) => c.name);

    const b = await getBrowser();
    const context = await b.newContext({ viewport: { width, height } });

    if (cookies.length > 0) {
        await context.addCookies(cookies);
    }

    const page = await context.newPage();
    await page.goto(`${origin}${renderPath}`);
    await page.waitForSelector(waitForSelector, { timeout: 10000 });

    const png = await page.screenshot({ type: 'png' });
    await page.close();
    await context.close();

    return png.buffer as ArrayBuffer;
}
