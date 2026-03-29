import { action } from '../_generated/server';
import { api, internal } from '../_generated/api';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { applicationScope, applicationType, pluginTopic } from '../schema';

async function workosPost<T>(path: string, body?: unknown): Promise<T> {
    const apiKey = process.env.WORKOS_API_KEY;
    if (!apiKey) throw new Error('WORKOS_API_KEY is required');

    const res = await fetch(`https://api.workos.com${path}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) throw new Error(`WorkOS API error ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
}

type WorkOSApp = { id: string; client_id: string };
type WorkOSSecret = { hint?: string; secret?: string };

export const provision = action({
    args: {
        actorName: v.string(),
        actorEmail: v.optional(v.string()),
        name: v.string(),
        description: v.optional(v.string()),
        type: applicationType,
        workosOrganizationId: v.string(),
        scopes: v.optional(v.array(applicationScope)),
        plugin: v.optional(
            v.object({
                version: v.optional(v.string()),
                topics: v.optional(v.array(pluginTopic)),
                configSchema: v.optional(v.any()),
            }),
        ),
    },
    handler: async (
        ctx,
        args,
    ): Promise<{
        applicationId: Id<'applications'>;
        actorId: Id<'actors'>;
        clientId: string;
        clientSecret: string;
        secretHint: string | undefined;
    }> => {
        await ctx.runQuery(internal.plugins.applications.requireManager, {});

        const appData = await workosPost<{ connect_application?: WorkOSApp } & WorkOSApp>('/connect/applications', {
            name: args.name,
            description: args.description,
            application_type: 'm2m',
            organization_id: args.workosOrganizationId,
        });
        const workosApp = 'connect_application' in appData ? appData.connect_application! : appData;

        const secretData = await workosPost<{ connect_application_secret?: WorkOSSecret } & WorkOSSecret>(
            `/connect/applications/${workosApp.id}/client_secrets`,
        );
        const secret = 'connect_application_secret' in secretData ? secretData.connect_application_secret! : secretData;
        if (!secret.secret) throw new Error('WorkOS did not return a client secret');

        const result = await ctx.runMutation(api.plugins.applications.createApplicationRecord, {
            actorName: args.actorName,
            actorEmail: args.actorEmail,
            name: args.name,
            description: args.description,
            type: args.type,
            workosOrganizationId: args.workosOrganizationId,
            workosApplicationId: workosApp.id,
            workosClientId: workosApp.client_id,
            lastSecretHint: secret.hint,
            scopes: args.scopes,
            plugin: args.type === 'plugin' ? args.plugin : undefined,
        });

        return {
            applicationId: result.applicationId,
            actorId: result.actorId,
            clientId: workosApp.client_id,
            clientSecret: secret.secret,
            secretHint: secret.hint,
        };
    },
});

export const rotateSecret = action({
    args: { id: v.id('applications') },
    handler: async (
        ctx,
        args,
    ): Promise<{
        clientId: string;
        clientSecret: string;
        secretHint: string | undefined;
    }> => {
        const application = await ctx.runQuery(api.plugins.applications.getCredentialsTarget, {
            applicationId: args.id,
        });
        if (!application) throw new Error('Application not found');

        const secretData = await workosPost<{ connect_application_secret?: WorkOSSecret } & WorkOSSecret>(
            `/connect/applications/${application.workosApplicationId}/client_secrets`,
        );
        const secret = 'connect_application_secret' in secretData ? secretData.connect_application_secret! : secretData;
        if (!secret.secret) throw new Error('WorkOS did not return a client secret');

        await ctx.runMutation(api.plugins.applications.updateProvisionedCredentials, {
            id: args.id,
            lastSecretHint: secret.hint,
        });

        return {
            clientId: application.workosClientId,
            clientSecret: secret.secret,
            secretHint: secret.hint,
        };
    },
});
