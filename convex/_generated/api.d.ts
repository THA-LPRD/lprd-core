/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as devices from "../devices.js";
import type * as frames from "../frames.js";
import type * as http from "../http.js";
import type * as lib_acl from "../lib/acl.js";
import type * as organizations from "../organizations.js";
import type * as plugin_createTemplate from "../plugin/createTemplate.js";
import type * as plugin_data from "../plugin/data.js";
import type * as plugin_register from "../plugin/register.js";
import type * as plugins from "../plugins.js";
import type * as templates from "../templates.js";
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
  devices: typeof devices;
  frames: typeof frames;
  http: typeof http;
  "lib/acl": typeof lib_acl;
  organizations: typeof organizations;
  "plugin/createTemplate": typeof plugin_createTemplate;
  "plugin/data": typeof plugin_data;
  "plugin/register": typeof plugin_register;
  plugins: typeof plugins;
  templates: typeof templates;
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
