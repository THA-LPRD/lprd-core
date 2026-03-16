import { SiteProvider } from '@/components/site/site-provider';

export default async function SlugLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    return <SiteProvider slug={slug}>{children}</SiteProvider>;
}
