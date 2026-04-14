import type { Id } from '@convex/dataModel';
import { InboxPage } from '@/components/inbox/inbox-page';

export default async function InboxMessageRoute({ params }: { params: Promise<{ messageId: string }> }) {
    const { messageId } = await params;
    return <InboxPage messageId={messageId as Id<'systemMessages'>} />;
}
