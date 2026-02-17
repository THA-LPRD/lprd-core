import { NextResponse } from 'next/server';
import { generateThumbnail } from '@/lib/render/thumbnail';
import { DEFAULT_CELL_SIZE, GRID_COLS, GRID_ROWS } from '@/lib/render/constants';

const WIDTH = GRID_COLS * DEFAULT_CELL_SIZE;
const HEIGHT = GRID_ROWS * DEFAULT_CELL_SIZE;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { deviceId, orgSlug } = body;

        if (!deviceId || !orgSlug) {
            return NextResponse.json({ error: 'deviceId and orgSlug are required' }, { status: 400 });
        }

        const { origin, hostname } = new URL(request.url);

        const png = await generateThumbnail({
            renderPath: `/org/${orgSlug}/devices/render/${deviceId}`,
            width: WIDTH,
            height: HEIGHT,
            cookieHeader: request.headers.get('cookie') ?? '',
            origin,
            hostname,
        });

        return new Response(png, {
            headers: { 'Content-Type': 'image/png' },
        });
    } catch (error) {
        console.error('Device render error:', error);
        return NextResponse.json({ error: 'Failed to render device' }, { status: 500 });
    }
}
