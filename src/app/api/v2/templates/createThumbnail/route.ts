import { ConvexHttpClient } from 'convex/browser';
import type { FunctionReference, FunctionReturnType, FunctionVisibility } from 'convex/server';
import { NextResponse } from 'next/server';
import { internal } from '@convex/api';
import { generateScreenshot, getVariantPixelSize } from '@/lib/render/thumbnail';
import type { TemplateVariant } from '@/lib/template';

type InternalThumbnailConvexClient = Omit<ConvexHttpClient, 'query'> & {
    setAdminAuth(token: string): void;
    query<Ref extends FunctionReference<'query', FunctionVisibility>>(
        ref: Ref,
        args: Ref['_args'],
    ): Promise<FunctionReturnType<Ref>>;
};

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!) as unknown as InternalThumbnailConvexClient;

convex.setAdminAuth(process.env.CONVEX_DEPLOY_KEY!);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { templateId, siteSlug } = body;

        if (!templateId || !siteSlug) {
            return NextResponse.json({ error: 'templateId and siteSlug are required' }, { status: 400 });
        }

        const template = await convex.query(internal.templates.crud.getByIdInternal, { id: templateId });

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
            renderPath: `/site/${siteSlug}/templates/render/${templateId}`,
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
