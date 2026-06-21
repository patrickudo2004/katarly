/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as attendance from "../attendance.js";
import type * as auth from "../auth.js";
import type * as borrow from "../borrow.js";
import type * as chat from "../chat.js";
import type * as churches from "../churches.js";
import type * as crons from "../crons.js";
import type * as deaconBoard from "../deaconBoard.js";
import type * as departments from "../departments.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as invites from "../invites.js";
import type * as meetings from "../meetings.js";
import type * as nfc from "../nfc.js";
import type * as notifications from "../notifications.js";
import type * as oversight from "../oversight.js";
import type * as probation from "../probation.js";
import type * as recognition from "../recognition.js";
import type * as reports from "../reports.js";
import type * as rewards from "../rewards.js";
import type * as rotas from "../rotas.js";
import type * as services from "../services.js";
import type * as shiftSwap from "../shiftSwap.js";
import type * as subunits from "../subunits.js";
import type * as timeOff from "../timeOff.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  attendance: typeof attendance;
  auth: typeof auth;
  borrow: typeof borrow;
  chat: typeof chat;
  churches: typeof churches;
  crons: typeof crons;
  deaconBoard: typeof deaconBoard;
  departments: typeof departments;
  emails: typeof emails;
  http: typeof http;
  invites: typeof invites;
  meetings: typeof meetings;
  nfc: typeof nfc;
  notifications: typeof notifications;
  oversight: typeof oversight;
  probation: typeof probation;
  recognition: typeof recognition;
  reports: typeof reports;
  rewards: typeof rewards;
  rotas: typeof rotas;
  services: typeof services;
  shiftSwap: typeof shiftSwap;
  subunits: typeof subunits;
  timeOff: typeof timeOff;
  users: typeof users;
  utils: typeof utils;
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
