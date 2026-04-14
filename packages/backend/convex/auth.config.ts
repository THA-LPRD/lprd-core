const clientId = process.env.WORKOS_CLIENT_ID;
const authkitDomain = process.env.WORKOS_AUTHKIT_DOMAIN?.replace(/\/$/, '');

const authConfig = {
    providers: [
        {
            type: 'customJwt',
            issuer: `https://api.workos.com/`,
            algorithm: 'RS256',
            applicationID: clientId,
            jwks: `https://api.workos.com/sso/jwks/${clientId}`,
        },
        {
            type: 'customJwt',
            issuer: `https://api.workos.com/user_management/${clientId}`,
            algorithm: 'RS256',
            jwks: `https://api.workos.com/sso/jwks/${clientId}`,
        },
        {
            type: 'customJwt',
            issuer: authkitDomain,
            algorithm: 'RS256',
            applicationID: clientId,
            jwks: authkitDomain ? `${authkitDomain}/oauth2/jwks` : undefined,
        },
    ],
};

export default authConfig;
