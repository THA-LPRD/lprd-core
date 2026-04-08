export const permissionValues = [
    'platform.actor.manage',
    'org.view',
    'org.manage',
    'org.actor.view',
    'org.actor.invite',
    'org.actor.serviceAccount.manage',
    'org.actor.serviceAccount.manage.healthCheck.read',
    'org.actor.serviceAccount.manage.healthCheck.write',
    'org.actor.serviceAccount.manage.healthCheck.write.job.read',
    'org.actor.serviceAccount.manage.healthCheck.write.job.write',
    'org.actor.serviceAccount.manage.healthCheck.write.job.enqueue',
    'org.site.create',
    'org.template.view',
    'org.template.manage',
    'org.template.manage.job.read',
    'org.template.manage.job.write',
    'org.template.manage.job.enqueue',
    'org.template.manage.sampleData.read',
    'org.template.manage.sampleData.write',
    'org.template.manage.thumbnail.read',
    'org.template.manage.thumbnail.write',
    'org.template.manage.upsert',
    'org.template.manage.upsert.job.read',
    'org.template.manage.upsert.job.write',
    'org.template.manage.upsert.job.enqueue',
    'org.site.view',
    'org.site.manage',
    'org.site.actor.manage',
    'org.site.template.view',
    'org.site.template.manage',
    'org.site.template.manage.job.read',
    'org.site.template.manage.job.write',
    'org.site.template.manage.job.enqueue',
    'org.site.template.manage.sampleData.read',
    'org.site.template.manage.sampleData.write',
    'org.site.template.manage.thumbnail.read',
    'org.site.template.manage.thumbnail.write',
    'org.site.frame.view',
    'org.site.frame.manage',
    'org.site.frame.manage.job.read',
    'org.site.frame.manage.job.write',
    'org.site.frame.manage.job.enqueue',
    'org.site.frame.manage.thumbnail.read',
    'org.site.frame.manage.thumbnail.write',
    'org.site.device.view',
    'org.site.device.manage',
    'org.site.device.manage.job.read',
    'org.site.device.manage.job.write',
    'org.site.device.manage.job.enqueue',
    'org.site.device.manage.artifact.read',
    'org.site.device.manage.artifact.write',
    'org.site.pluginData.view',
    'org.site.pluginData.manage',
    'org.site.pluginData.manage.job.read',
    'org.site.pluginData.manage.job.write',
    'org.site.pluginData.manage.job.enqueue',
] as const;

export type Permission = (typeof permissionValues)[number];
export type ApplicationPermission = Permission;

export const permissionCatalog = {
    platform: {
        actor: {
            manage: 'platform.actor.manage',
        },
    },
    org: {
        view: 'org.view',
        manage: 'org.manage',
        actor: {
            view: 'org.actor.view',
            invite: 'org.actor.invite',
            serviceAccount: {
                manage: 'org.actor.serviceAccount.manage',
                healthCheck: {
                    read: 'org.actor.serviceAccount.manage.healthCheck.read',
                    write: {
                        self: 'org.actor.serviceAccount.manage.healthCheck.write',
                        job: {
                            read: 'org.actor.serviceAccount.manage.healthCheck.write.job.read',
                            write: 'org.actor.serviceAccount.manage.healthCheck.write.job.write',
                            enqueue: 'org.actor.serviceAccount.manage.healthCheck.write.job.enqueue',
                        },
                    },
                },
            },
        },
        site: {
            create: 'org.site.create',
            view: 'org.site.view',
            manage: 'org.site.manage',
            actor: {
                manage: 'org.site.actor.manage',
            },
            template: {
                view: 'org.site.template.view',
                manage: {
                    self: 'org.site.template.manage',
                    job: {
                        read: 'org.site.template.manage.job.read',
                        write: 'org.site.template.manage.job.write',
                        enqueue: 'org.site.template.manage.job.enqueue',
                    },
                    sampleData: {
                        read: 'org.site.template.manage.sampleData.read',
                        write: 'org.site.template.manage.sampleData.write',
                    },
                    thumbnail: {
                        read: 'org.site.template.manage.thumbnail.read',
                        write: 'org.site.template.manage.thumbnail.write',
                    },
                },
            },
            frame: {
                view: 'org.site.frame.view',
                manage: {
                    self: 'org.site.frame.manage',
                    job: {
                        read: 'org.site.frame.manage.job.read',
                        write: 'org.site.frame.manage.job.write',
                        enqueue: 'org.site.frame.manage.job.enqueue',
                    },
                    thumbnail: {
                        read: 'org.site.frame.manage.thumbnail.read',
                        write: 'org.site.frame.manage.thumbnail.write',
                    },
                },
            },
            device: {
                view: 'org.site.device.view',
                manage: {
                    self: 'org.site.device.manage',
                    job: {
                        read: 'org.site.device.manage.job.read',
                        write: 'org.site.device.manage.job.write',
                        enqueue: 'org.site.device.manage.job.enqueue',
                    },
                    artifact: {
                        read: 'org.site.device.manage.artifact.read',
                        write: 'org.site.device.manage.artifact.write',
                    },
                },
            },
            pluginData: {
                view: 'org.site.pluginData.view',
                manage: {
                    self: 'org.site.pluginData.manage',
                    job: {
                        read: 'org.site.pluginData.manage.job.read',
                        write: 'org.site.pluginData.manage.job.write',
                        enqueue: 'org.site.pluginData.manage.job.enqueue',
                    },
                },
            },
        },
        template: {
            view: 'org.template.view',
            manage: {
                self: 'org.template.manage',
                job: {
                    read: 'org.template.manage.job.read',
                    write: 'org.template.manage.job.write',
                    enqueue: 'org.template.manage.job.enqueue',
                },
                sampleData: {
                    read: 'org.template.manage.sampleData.read',
                    write: 'org.template.manage.sampleData.write',
                },
                thumbnail: {
                    read: 'org.template.manage.thumbnail.read',
                    write: 'org.template.manage.thumbnail.write',
                },
                upsert: {
                    self: 'org.template.manage.upsert',
                    job: {
                        read: 'org.template.manage.upsert.job.read',
                        write: 'org.template.manage.upsert.job.write',
                        enqueue: 'org.template.manage.upsert.job.enqueue',
                    },
                },
            },
        },
    },
} as const satisfies Record<string, unknown>;
