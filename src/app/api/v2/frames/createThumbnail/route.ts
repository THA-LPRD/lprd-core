import { NextResponse } from 'next/server';
import { generateScreenshot } from '@/lib/render/thumbnail';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { frameId, siteSlug, width, height } = body;

        if (!frameId || !siteSlug || !width || !height) {
            return NextResponse.json({ error: 'frameId, siteSlug, width, and height are required' }, { status: 400 });
        }

        const { origin } = new URL(request.url);

        const png = await generateScreenshot({
            renderPath: `/site/${siteSlug}/frames/render/${frameId}`,
            width,
            height,
            origin,
        });

        return new Response(png, {
            headers: { 'Content-Type': 'image/png' },
        });
    } catch (error) {
        console.error('Frame thumbnail generation error:', error);
        return NextResponse.json({ error: 'Failed to generate thumbnail' }, { status: 500 });
    }
}
