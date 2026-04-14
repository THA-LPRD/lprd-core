import { workosRequest } from '@shared/workos/shared';

type ConnectApplication = {
    id: string;
    client_id: string;
    name: string;
    description?: string;
    application_type: 'm2m';
    organization_id: string;
    scopes: string[];
};

type ConnectClientSecret = {
    id: string;
    hint?: string;
    secret?: string;
};

type ConnectApplicationResponse =
    | ConnectApplication
    | {
          connect_application: ConnectApplication;
      };

type ConnectClientSecretResponse =
    | ConnectClientSecret
    | {
          connect_application_secret: ConnectClientSecret;
      };

export async function create(input: { name: string; description?: string; organizationId: string }) {
    const result = await workosRequest<ConnectApplicationResponse>('/connect/applications', {
        method: 'POST',
        body: JSON.stringify({
            name: input.name,
            description: input.description,
            application_type: 'm2m',
            organization_id: input.organizationId,
        }),
    });

    return 'connect_application' in result ? result.connect_application : result;
}

export async function createSecret(workosApplicationId: string) {
    const result = await workosRequest<ConnectClientSecretResponse>(
        `/connect/applications/${workosApplicationId}/client_secrets`,
        { method: 'POST' },
    );

    return 'connect_application_secret' in result ? result.connect_application_secret : result;
}
