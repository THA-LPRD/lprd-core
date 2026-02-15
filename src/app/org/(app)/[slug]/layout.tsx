import { OrgProvider } from '@/components/org/org-provider';

export default async function SlugLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    return <OrgProvider slug={slug}>{children}</OrgProvider>;
}
