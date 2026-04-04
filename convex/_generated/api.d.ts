/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actors from "../actors.js";
import type * as applications_crud from "../applications/crud.js";
import type * as applications_plugin_data from "../applications/plugin/data.js";
import type * as applications_plugin_health from "../applications/plugin/health.js";
import type * as applications_plugin_registration from "../applications/plugin/registration.js";
import type * as applications_plugin_siteAccess from "../applications/plugin/siteAccess.js";
import type * as applications_provision from "../applications/provision.js";
import type * as devices_accessLogs from "../devices/accessLogs.js";
import type * as devices_crud from "../devices/crud.js";
import type * as devices_render from "../devices/render.js";
import type * as devices_v1 from "../devices/v1.js";
import type * as frames from "../frames.js";
import type * as http from "../http.js";
import type * as jobs from "../jobs.js";
import type * as lib_acl from "../lib/acl.js";
import type * as lib_applications from "../lib/applications.js";
import type * as lib_deviceLogs from "../lib/deviceLogs.js";
import type * as lib_internal_render from "../lib/internal_render.js";
import type * as lib_storage from "../lib/storage.js";
import type * as lib_template from "../lib/template.js";
import type * as lib_template_data from "../lib/template_data.js";
import type * as organizations from "../organizations.js";
import type * as sites from "../sites.js";
import type * as templates_crud from "../templates/crud.js";
import type * as templates_global from "../templates/global.js";
import type * as workos_helpers from "../workos/helpers.js";
import type * as workos_orgCreated from "../workos/orgCreated.js";
import type * as workos_orgDeleted from "../workos/orgDeleted.js";
import type * as workos_orgUpdated from "../workos/orgUpdated.js";
import type * as workos_userCreated from "../workos/userCreated.js";
import type * as workos_userDeleted from "../workos/userDeleted.js";
import type * as workos_userUpdated from "../workos/userUpdated.js";
import type * as workos_utils from "../workos/utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actors: typeof actors;
  "applications/crud": typeof applications_crud;
  "applications/plugin/data": typeof applications_plugin_data;
  "applications/plugin/health": typeof applications_plugin_health;
  "applications/plugin/registration": typeof applications_plugin_registration;
  "applications/plugin/siteAccess": typeof applications_plugin_siteAccess;
  "applications/provision": typeof applications_provision;
  "devices/accessLogs": typeof devices_accessLogs;
  "devices/crud": typeof devices_crud;
  "devices/render": typeof devices_render;
  "devices/v1": typeof devices_v1;
  frames: typeof frames;
  http: typeof http;
  jobs: typeof jobs;
  "lib/acl": typeof lib_acl;
  "lib/applications": typeof lib_applications;
  "lib/deviceLogs": typeof lib_deviceLogs;
  "lib/internal_render": typeof lib_internal_render;
  "lib/storage": typeof lib_storage;
  "lib/template": typeof lib_template;
  "lib/template_data": typeof lib_template_data;
  organizations: typeof organizations;
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
