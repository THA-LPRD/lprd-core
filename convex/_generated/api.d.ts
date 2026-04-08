/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actors from '../actors.js';
import type * as applications_crud from '../applications/crud.js';
import type * as applications_plugin_data from '../applications/plugin/data.js';
import type * as applications_plugin_health from '../applications/plugin/health.js';
import type * as applications_plugin_registration from '../applications/plugin/registration.js';
import type * as applications_plugin_sites from '../applications/plugin/sites.js';
import type * as applications_provision from '../applications/provision.js';
import type * as authorization from '../authorization.js';
import type * as devices_accessLogs from '../devices/accessLogs.js';
import type * as devices_crud from '../devices/crud.js';
import type * as devices_render from '../devices/render.js';
import type * as devices_v1 from '../devices/v1.js';
import type * as frames from '../frames.js';
import type * as http from '../http.js';
import type * as jobs_applicationJobs from '../jobs/applicationJobs.js';
import type * as jobs_deviceJobs from '../jobs/deviceJobs.js';
import type * as jobs_frameJobs from '../jobs/frameJobs.js';
import type * as jobs_pluginDataJobs from '../jobs/pluginDataJobs.js';
import type * as jobs_templateJobs from '../jobs/templateJobs.js';
import type * as jobs_types from '../jobs/types.js';
import type * as lib_applications from '../lib/applications.js';
import type * as lib_authz from '../lib/authz.js';
import type * as lib_deviceLogs from '../lib/deviceLogs.js';
import type * as lib_permissionGrants from '../lib/permissionGrants.js';
import type * as lib_permissionSync from '../lib/permissionSync.js';
import type * as lib_permissions_catalog from '../lib/permissions/catalog.js';
import type * as lib_permissions_index from '../lib/permissions/index.js';
import type * as lib_permissions_matcher from '../lib/permissions/matcher.js';
import type * as lib_permissions_presets_actorRole from '../lib/permissions/presets/actorRole.js';
import type * as lib_permissions_presets_serviceAccount from '../lib/permissions/presets/serviceAccount.js';
import type * as lib_permissions_presets_siteActorRole from '../lib/permissions/presets/siteActorRole.js';
import type * as lib_permissions_targets from '../lib/permissions/targets.js';
import type * as lib_publicIds from '../lib/publicIds.js';
import type * as lib_storage from '../lib/storage.js';
import type * as lib_template from '../lib/template.js';
import type * as lib_template_data from '../lib/template_data.js';
import type * as organizations from '../organizations.js';
import type * as siteActors from '../siteActors.js';
import type * as sites from '../sites.js';
import type * as templates_crud from '../templates/crud.js';
import type * as templates_global from '../templates/global.js';
import type * as workos_helpers from '../workos/helpers.js';
import type * as workos_orgCreated from '../workos/orgCreated.js';
import type * as workos_orgDeleted from '../workos/orgDeleted.js';
import type * as workos_orgUpdated from '../workos/orgUpdated.js';
import type * as workos_userCreated from '../workos/userCreated.js';
import type * as workos_userDeleted from '../workos/userDeleted.js';
import type * as workos_userUpdated from '../workos/userUpdated.js';
import type * as workos_utils from '../workos/utils.js';

import type { ApiFromModules, FilterApi, FunctionReference, } from 'convex/server';

declare const fullApi: ApiFromModules<{
  actors: typeof actors;
  "applications/crud": typeof applications_crud;
  "applications/plugin/data": typeof applications_plugin_data;
  "applications/plugin/health": typeof applications_plugin_health;
  "applications/plugin/registration": typeof applications_plugin_registration;
  "applications/plugin/sites": typeof applications_plugin_sites;
  "applications/provision": typeof applications_provision;
  authorization: typeof authorization;
  "devices/accessLogs": typeof devices_accessLogs;
  "devices/crud": typeof devices_crud;
  "devices/render": typeof devices_render;
  "devices/v1": typeof devices_v1;
  frames: typeof frames;
  http: typeof http;
  "jobs/applicationJobs": typeof jobs_applicationJobs;
  "jobs/deviceJobs": typeof jobs_deviceJobs;
  "jobs/frameJobs": typeof jobs_frameJobs;
  "jobs/pluginDataJobs": typeof jobs_pluginDataJobs;
  "jobs/templateJobs": typeof jobs_templateJobs;
  "jobs/types": typeof jobs_types;
  "lib/applications": typeof lib_applications;
  "lib/authz": typeof lib_authz;
  "lib/deviceLogs": typeof lib_deviceLogs;
  "lib/permissionGrants": typeof lib_permissionGrants;
  "lib/permissionSync": typeof lib_permissionSync;
  "lib/permissions/catalog": typeof lib_permissions_catalog;
  "lib/permissions/index": typeof lib_permissions_index;
  "lib/permissions/matcher": typeof lib_permissions_matcher;
  "lib/permissions/presets/actorRole": typeof lib_permissions_presets_actorRole;
  "lib/permissions/presets/serviceAccount": typeof lib_permissions_presets_serviceAccount;
  "lib/permissions/presets/siteActorRole": typeof lib_permissions_presets_siteActorRole;
  "lib/permissions/targets": typeof lib_permissions_targets;
  "lib/publicIds": typeof lib_publicIds;
  "lib/storage": typeof lib_storage;
  "lib/template": typeof lib_template;
  "lib/template_data": typeof lib_template_data;
  organizations: typeof organizations;
  siteActors: typeof siteActors;
  sites: typeof sites;
  "templates/crud": typeof templates_crud;
  "templates/global": typeof templates_global;
  "workos/helpers": typeof workos_helpers;
  "workos/orgCreated": typeof workos_orgCreated;
  "workos/orgDeleted": typeof workos_orgDeleted;
  "workos/orgUpdated": typeof workos_orgUpdated;
  "workos/userCreated": typeof workos_userCreated;
  "workos/userDeleted": typeof workos_userDeleted;
  "workos/userUpdated": typeof workos_userUpdated;
  "workos/utils": typeof workos_utils;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
