'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/api';
import type { Id } from '@convex/dataModel';
import { ArrowLeft } from 'lucide-react';
import { isPluginApplication } from '@/lib/applications';
import { ApplicationDetailsCard } from '@/components/application/details-card';
import { PluginHealthCard } from '@/components/application/plugin/health-card';
import { PluginOrganizationAvailabilityCard } from '@/components/application/plugin/organization-availability-card';
import { Button } from '@/components/ui/button';

export default function ApplicationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const applicationId = params.id as Id<'applications'>;
    const application = useQuery(api.applications.crud.getDetails, { id: applicationId });
    const applicationPluginProfile = useQuery(
        api.applications.crud.getPluginProfile,
        application && isPluginApplication(application) ? { id: applicationId } : 'skip',
    );

    if (application === undefined) {
        return <div className="animate-pulse p-6 text-muted-foreground">Loading...</div>;
    }

    if (!application) {
        return <div className="p-6 text-muted-foreground">Service account not found</div>;
    }

    const isPlugin = isPluginApplication(application);

    return (
        <div className="flex h-full flex-col overflow-hidden p-6">
            <div className="flex-shrink-0 space-y-6 pb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="mr-1 size-4" />
                        Back
                    </Button>
                </div>

                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{application.name}</h1>
                    {application.description && <p className="text-muted-foreground">{application.description}</p>}
                </div>
            </div>

            {isPlugin ? (
                <>
                    <div className="flex-1 space-y-6 overflow-y-auto lg:hidden">
                        <ApplicationDetailsCard
                            application={application}
                            applicationPluginProfile={applicationPluginProfile ?? undefined}
                        />
                        <PluginOrganizationAvailabilityCard actorId={application.actorId} />
                        <PluginHealthCard pluginId={application._id} />
                    </div>

                    <div className="hidden flex-1 gap-6 overflow-hidden lg:flex">
                        <div className="flex w-1/2 flex-col gap-6 overflow-hidden">
                            <div className="flex-shrink-0">
                                <ApplicationDetailsCard
                                    application={application}
                                    applicationPluginProfile={applicationPluginProfile ?? undefined}
                                />
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto">
                                <PluginOrganizationAvailabilityCard actorId={application.actorId} />
                            </div>
                        </div>

                        <div className="w-1/2 overflow-y-auto">
                            <PluginHealthCard pluginId={application._id} />
                        </div>
                    </div>
                </>
            ) : (
                <div className="max-w-2xl">
                    <ApplicationDetailsCard application={application} />
                </div>
            )}
        </div>
    );
}
