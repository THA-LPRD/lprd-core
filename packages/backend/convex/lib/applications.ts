export type ApplicationType = 'plugin' | 'internal';

export type ApplicationLike = {
    type: ApplicationType;
};

export type PluginApplicationLike = ApplicationLike & {
    type: 'plugin';
};

export type InternalApplicationLike = ApplicationLike & {
    type: 'internal';
};

export function isPluginApplication<T extends ApplicationLike>(
    application: T,
): application is T & PluginApplicationLike {
    return application.type === 'plugin';
}

export function isInternalApplication<T extends ApplicationLike>(
    application: T,
): application is T & InternalApplicationLike {
    return application.type === 'internal';
}
