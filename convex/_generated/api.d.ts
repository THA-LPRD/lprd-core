/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as devices_accessLogs from "../devices/accessLogs.js";
import type * as devices_crud from "../devices/crud.js";
import type * as devices_render from "../devices/render.js";
import type * as devices_v1 from "../devices/v1.js";
import type * as frames from "../frames.js";
import type * as http from "../http.js";
import type * as lib_acl from "../lib/acl.js";
import type * as lib_deviceLogs from "../lib/deviceLogs.js";
import type * as lib_storage from "../lib/storage.js";
import type * as lib_template from "../lib/template.js";
import type * as lib_template_data from "../lib/template_data.js";
import type * as plugins_admin from "../plugins/admin.js";
import type * as plugins_data from "../plugins/data.js";
import type * as plugins_health from "../plugins/health.js";
import type * as plugins_images from "../plugins/images.js";
import type * as plugins_registration from "../plugins/registration.js";
import type * as plugins_siteAccess from "../plugins/siteAccess.js";
import type * as sites from "../sites.js";
import type * as templates_crud from "../templates/crud.js";
import type * as templates_global from "../templates/global.js";
import type * as templates_images from "../templates/images.js";
import type * as users from "../users.js";
import type * as workos_helpers from "../workos/helpers.js";
import type * as workos_userCreated from "../workos/userCreated.js";
import type * as workos_userDeleted from "../workos/userDeleted.js";
import type * as workos_userUpdated from "../workos/userUpdated.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "devices/accessLogs": typeof devices_accessLogs;
  "devices/crud": typeof devices_crud;
  "devices/render": typeof devices_render;
  "devices/v1": typeof devices_v1;
  frames: typeof frames;
  http: typeof http;
  "lib/acl": typeof lib_acl;
  "lib/deviceLogs": typeof lib_deviceLogs;
  "lib/storage": typeof lib_storage;
  "lib/template": typeof lib_template;
  "lib/template_data": typeof lib_template_data;
  "plugins/admin": typeof plugins_admin;
  "plugins/data": typeof plugins_data;
  "plugins/health": typeof plugins_health;
  "plugins/images": typeof plugins_images;
  "plugins/registration": typeof plugins_registration;
  "plugins/siteAccess": typeof plugins_siteAccess;
  sites: typeof sites;
  "templates/crud": typeof templates_crud;
  "templates/global": typeof templates_global;
  "templates/images": typeof templates_images;
  users: typeof users;
  "workos/helpers": typeof workos_helpers;
  "workos/userCreated": typeof workos_userCreated;
  "workos/userDeleted": typeof workos_userDeleted;
  "workos/userUpdated": typeof workos_userUpdated;
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
