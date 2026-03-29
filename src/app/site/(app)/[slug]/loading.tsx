import { Skeleton } from '@/components/ui/skeleton';

export default function SiteLoading() {
    return (
        <div className="p-6">
            <Skeleton className="mb-2 h-8 w-48" />
            <Skeleton className="h-4 w-32" />
        </div>
    );
}
