import { NextResponse } from 'next/server';
import { generateScreenshot } from '@/lib/render/thumbnail';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { frameId, orgSlug, width, height } = body;

        if (!frameId || !orgSlug || !width || !height) {
            return NextResponse.json({ error: 'frameId, orgSlug, width, and height are required' }, { status: 400 });
        }

        const { origin } = new URL(request.url);

        const png = await generateScreenshot({
            renderPath: `/org/${orgSlug}/frames/render/${frameId}`,
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
