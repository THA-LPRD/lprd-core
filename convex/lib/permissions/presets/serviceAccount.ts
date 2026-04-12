import type { ApplicationType } from '../../applications';
import { type Permission, permissionCatalog } from '../catalog';

export function getServiceAccountDefaultPermissions(applicationType: ApplicationType): Permission[] {
    if (applicationType === 'internal') {
        return [
            permissionCatalog.org.actor.serviceAccount.healthCheck.read,
            permissionCatalog.org.actor.serviceAccount.healthCheck.write.self,
            permissionCatalog.org.actor.serviceAccount.healthCheck.write.job.read,
            permissionCatalog.org.actor.serviceAccount.healthCheck.write.job.write,
            permissionCatalog.org.actor.serviceAccount.healthCheck.write.job.enqueue,
            permissionCatalog.org.template.manage.sampleData.read,
            permissionCatalog.org.template.manage.sampleData.write,
            permissionCatalog.org.template.manage.thumbnail.read,
            permissionCatalog.org.template.manage.thumbnail.write,
            permissionCatalog.org.template.manage.upsert.job.read,
            permissionCatalog.org.template.manage.upsert.job.write,
            permissionCatalog.org.template.manage.upsert.job.enqueue,
            permissionCatalog.org.template.view,
            permissionCatalog.org.site.template.manage.job.read,
            permissionCatalog.org.site.template.manage.job.write,
            permissionCatalog.org.site.template.manage.job.enqueue,
            permissionCatalog.org.site.template.manage.sampleData.read,
            permissionCatalog.org.site.template.manage.sampleData.write,
            permissionCatalog.org.site.template.manage.thumbnail.read,
            permissionCatalog.org.site.template.manage.thumbnail.write,
            permissionCatalog.org.site.template.view,
            permissionCatalog.org.site.frame.manage.job.read,
            permissionCatalog.org.site.frame.manage.job.write,
            permissionCatalog.org.site.frame.manage.job.enqueue,
            permissionCatalog.org.site.frame.manage.thumbnail.read,
            permissionCatalog.org.site.frame.manage.thumbnail.write,
            permissionCatalog.org.site.frame.view,
            permissionCatalog.org.site.device.manage.job.read,
            permissionCatalog.org.site.device.manage.job.write,
            permissionCatalog.org.site.device.manage.job.enqueue,
            permissionCatalog.org.site.device.manage.artifact.read,
            permissionCatalog.org.site.device.manage.artifact.write,
            permissionCatalog.org.site.device.view,
            permissionCatalog.org.site.pluginData.view,
            permissionCatalog.org.site.pluginData.manage.self,
            permissionCatalog.org.site.asset.view,
        ];
    }

    if (applicationType === 'plugin') {
        return [
            permissionCatalog.org.site.pluginData.manage.self,
            permissionCatalog.org.site.device.manage.job.enqueue,
            permissionCatalog.org.template.manage.upsert.self,
            permissionCatalog.org.template.manage.upsert.job.enqueue,
        ];
    }

    return [];
}
