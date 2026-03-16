import { NextResponse } from 'next/server';
import { internal } from '@convex/api';
import { asPublic, getConvexClient } from '@/lib/convex-server';
import { generateScreenshot, getVariantPixelSize } from '@/lib/render/thumbnail';
import type { TemplateVariant } from '@/lib/template';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { templateId, orgSlug } = body;

        if (!templateId || !orgSlug) {
            return NextResponse.json({ error: 'templateId and orgSlug are required' }, { status: 400 });
        }

        const convex = getConvexClient();
        const template = await convex.query(asPublic(internal.templates.crud.getByIdInternal), { id: templateId });

        if (!template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        const variants = template.variants as TemplateVariant[];
        const preferred = variants[template.preferredVariantIndex];
        if (!preferred) {
            return NextResponse.json({ error: 'No preferred variant' }, { status: 400 });
        }

        const { origin } = new URL(request.url);
        const { width, height } = getVariantPixelSize(preferred);

        const png = await generateScreenshot({
            renderPath: `/org/${orgSlug}/templates/render/${templateId}`,
            width,
            height,
            origin,
        });

        return new Response(png, {
            headers: { 'Content-Type': 'image/png' },
        });
    } catch (error) {
        console.error('Template thumbnail generation error:', error);
        return NextResponse.json({ error: 'Failed to generate thumbnail' }, { status: 500 });
    }
}
