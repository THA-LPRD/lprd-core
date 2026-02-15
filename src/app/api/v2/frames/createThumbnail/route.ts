import { NextResponse } from 'next/server';
import { generateThumbnail } from '@/lib/render/thumbnail';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { frameId, orgSlug, width, height } = body;

        if (!frameId || !orgSlug || !width || !height) {
            return NextResponse.json({ error: 'frameId, orgSlug, width, and height are required' }, { status: 400 });
        }

        const { origin, hostname } = new URL(request.url);

        const png = await generateThumbnail({
            renderPath: `/org/${orgSlug}/frames/render/${frameId}`,
            width,
            height,
            cookieHeader: request.headers.get('cookie') ?? '',
            origin,
            hostname,
        });

        return new Response(png, {
            headers: { 'Content-Type': 'image/png' },
        });
    } catch (error) {
        console.error('Frame thumbnail generation error:', error);
        return NextResponse.json({ error: 'Failed to generate thumbnail' }, { status: 500 });
    }
}
