import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@workspace/ui/components/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@workspace/ui/components/empty';

interface NotFoundProps {
    title: string;
    description: string;
    backHref?: string;
    backLabel?: string;
    className?: string;
}

function NotFound({ title, description, backHref, backLabel, className }: NotFoundProps) {
    return (
        <div className={cn('p-6', className)}>
            <Empty className="py-12">
                <EmptyHeader>
                    <EmptyTitle>{title}</EmptyTitle>
                    <EmptyDescription>{description}</EmptyDescription>
                </EmptyHeader>
                {backHref && (
                    <EmptyContent>
                        <Button render={<Link href={backHref} />} nativeButton={false}>
                            <ArrowLeft className="size-4" />
                            {backLabel ?? 'Go back'}
                        </Button>
                    </EmptyContent>
                )}
            </Empty>
        </div>
    );
}

type PresetProps = Pick<NotFoundProps, 'backHref' | 'backLabel'>;

function SiteNotFound(props: PresetProps) {
    return (
        <NotFound
            title="Site not found"
            description="The site you're looking for doesn't exist or you don't have access."
            {...props}
        />
    );
}

function TemplateNotFound(props: PresetProps) {
    return (
        <NotFound
            title="Template not found"
            description="The template you're looking for doesn't exist or you don't have access."
            {...props}
        />
    );
}

function DeviceNotFound(props: PresetProps) {
    return (
        <NotFound
            title="Device not found"
            description="The device you're looking for doesn't exist or you don't have access."
            {...props}
        />
    );
}

function FrameNotFound(props: PresetProps) {
    return (
        <NotFound
            title="Frame not found"
            description="The frame you're looking for doesn't exist or you don't have access."
            {...props}
        />
    );
}

function AccessDenied(props: PresetProps) {
    return <NotFound title="Access Denied" description="You don't have permission to access this page." {...props} />;
}

export { NotFound, SiteNotFound, TemplateNotFound, DeviceNotFound, FrameNotFound, AccessDenied };
