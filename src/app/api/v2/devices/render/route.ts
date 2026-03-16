import { NextResponse } from 'next/server';
import { generateScreenshot } from '@/lib/render/thumbnail';
import { DEFAULT_CELL_SIZE, GRID_COLS, GRID_ROWS } from '@/lib/render/constants';

const WIDTH = GRID_COLS * DEFAULT_CELL_SIZE;
const HEIGHT = GRID_ROWS * DEFAULT_CELL_SIZE;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { deviceId, siteSlug } = body;

        if (!deviceId || !siteSlug) {
            return NextResponse.json({ error: 'deviceId and siteSlug are required' }, { status: 400 });
        }

        const { origin } = new URL(request.url);

        const png = await generateScreenshot({
            renderPath: `/site/${siteSlug}/devices/render/${deviceId}`,
            width: WIDTH,
            height: HEIGHT,
            origin,
        });

        return new Response(png, {
            headers: { 'Content-Type': 'image/png' },
        });
    } catch (error) {
        console.error('Device render error:', error);
        return NextResponse.json({ error: 'Failed to render device' }, { status: 500 });
    }
}
