import {NextResponse} from 'next/server';
import {chromium, type Browser} from 'playwright';

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
    if (!browser || !browser.isConnected()) {
        browser = await chromium.launch({headless: true});
    }
    return browser;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {templateId, orgSlug, width, height} = body;

        if (!templateId || !orgSlug || !width || !height) {
            return NextResponse.json(
                {error: 'templateId, orgSlug, width, and height are required'},
                {status: 400},
            );
        }

        // Parse cookies from the incoming request to forward to the render page
        const cookieHeader = request.headers.get('cookie') ?? '';
        const origin = new URL(request.url).origin;
        const hostname = new URL(request.url).hostname;

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
        const context = await b.newContext({viewport: {width, height}});

        if (cookies.length > 0) {
            await context.addCookies(cookies);
        }

        const page = await context.newPage();
        await page.goto(`${origin}/org/${orgSlug}/templates/render/${templateId}`);
        await page.waitForSelector('[data-rendered]', {timeout: 10000});

        const png = await page.screenshot({type: 'png'});
        await page.close();
        await context.close();

        return new Response(png.buffer as ArrayBuffer, {
            headers: {'Content-Type': 'image/png'},
        });
    } catch (error) {
        console.error('Thumbnail generation error:', error);
        return NextResponse.json(
            {error: 'Failed to generate thumbnail'},
            {status: 500},
        );
    }
}
