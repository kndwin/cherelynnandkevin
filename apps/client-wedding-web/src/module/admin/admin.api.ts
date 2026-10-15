import {
  AdminDeleteGuestResponseSchema,
  AdminGuestSchema,
  AdminListGuestsResponseSchema,
  AdminLoginResponseSchema,
  type AdminCreateGuestRequest,
  type AdminDeleteGuestResponse,
  type AdminGuest,
  type AdminListGuestsResponse,
  type AdminLoginResponse,
  type AdminUpdateGuestRequest,
  AdminRoutes,
} from "@cherelynnandkevin/client-api-contract/admin/http";
import { Exit, Schema } from "effect";
import { AdminSyncRunSchema, AdminSyncStatusSchema, AdminFailedAttemptSchema, AdminListFailedAttemptsResponseSchema, AdminDeleteFailedAttemptsResponseSchema, type FailedAuthStatus, type FailedAuthReason, type AdminUpdateFailedAttemptRequest } from "@cherelynnandkevin/client-api-contract/admin/http";

export const getSyncStatus = () => requestJson(AdminSyncStatusSchema, AdminRoutes.syncStatus, { method: "GET" });
export const triggerSync = () => requestJson(AdminSyncRunSchema, AdminRoutes.triggerSync, { method: "POST" });
export const listFailedAttempts = (page: number, status: FailedAuthStatus | "", reason: FailedAuthReason | "") => {
  const params = new URLSearchParams({ page: String(page), pageSize: "50" });
  if (status) params.set("status", status);
  if (reason) params.set("reason", reason);
  return requestJson(AdminListFailedAttemptsResponseSchema, `${AdminRoutes.failedAttempts}?${params}`, { method: "GET" });
};
export const updateFailedAttempt = (id: string, input: AdminUpdateFailedAttemptRequest) => requestJson(AdminFailedAttemptSchema, AdminRoutes.failedAttemptById(id), { method: "PATCH", body: JSON.stringify(input) });
export const deleteFailedAttempt = (id: string) => requestJson(AdminDeleteFailedAttemptsResponseSchema, AdminRoutes.failedAttemptById(id), { method: "DELETE" });
export const deleteFailedAttempts = (ids: readonly string[]) => requestJson(AdminDeleteFailedAttemptsResponseSchema, AdminRoutes.deleteFailedAttempts, { method: "POST", body: JSON.stringify({ ids }) });
import { AdminGroupSchema, AdminGroupsResponseSchema, AdminRsvpAuditResponseSchema, AdminRelationshipsResponseSchema, type AdminRelationshipRequest } from "@cherelynnandkevin/client-api-contract/admin/http";

export const listRelationships = () => requestJson(AdminRelationshipsResponseSchema, AdminRoutes.relationships, { method: "GET" });
export const getGuest = (id: string) => requestJson(AdminGuestSchema, AdminRoutes.guestById(id), { method: "GET" });
export const saveRelationship = (input: AdminRelationshipRequest) => requestJson(AdminRelationshipsResponseSchema, AdminRoutes.relationships, { method: "PATCH", body: JSON.stringify(input) });

export const listGroups = () => requestJson(AdminGroupsResponseSchema, AdminRoutes.groups, { method: "GET" });
export const saveGroup = (name: string, id?: string) => requestJson(AdminGroupSchema, id ? AdminRoutes.groupById(id) : AdminRoutes.groups, { method: id ? "PATCH" : "POST", body: JSON.stringify({ name }) });
export const removeGroup = (id: string) => requestJson(AdminDeleteGuestResponseSchema, AdminRoutes.groupById(id), { method: "DELETE" });
export const setMembership = (id: string, groupId: string | null) => requestJson(AdminGuestSchema, AdminRoutes.membership(id), { method: "PATCH", body: JSON.stringify({ groupId }) });
export const listRsvpAudit = () => requestJson(AdminRsvpAuditResponseSchema, AdminRoutes.rsvpAudit, { method: "GET" });

const apiBase = import.meta.env.VITE_API_URL ?? "/api";

class AdminApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

const decodeOrThrow = <S extends Schema.Decoder<unknown>>(schema: S, json: unknown, status: number): S["Type"] => {
  const result = Schema.decodeUnknownExit(schema)(json);
  if (Exit.isFailure(result)) {
    throw new AdminApiError(status, "Unexpected server response.");
  }
  return result.value;
};

const requestJson = async <S extends Schema.Decoder<unknown>>(
  schema: S,
  path: string,
  init: RequestInit,
): Promise<S["Type"]> => {
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...init,
      credentials: "include",
      headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    });
  } catch {
    throw new AdminApiError(0, "Could not reach the server. Please try again.");
  }

  if (response.status === 401) {
    throw new AdminApiError(401, "Your admin session expired. Please log in again.");
  }
  if (response.status === 503) {
    throw new AdminApiError(503, path === AdminRoutes.triggerSync ? "Google Sheets sync is not configured." : "Admin is not configured on the server.");
  }
  if (response.status === 409) throw new AdminApiError(409, path === AdminRoutes.triggerSync ? "A sync is already queued or running. Refresh its status." : "This RSVP changed since you loaded it. Reload the guest list before saving again; your edits have not been saved.");

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    throw new AdminApiError(response.status, "Unexpected server response.");
  }

  if (!response.ok) {
    const message =
      typeof json === "object" && json !== null && "message" in json && typeof json.message === "string"
        ? json.message
        : "Something went wrong. Please try again.";
    throw new AdminApiError(response.status, message);
  }

  return decodeOrThrow(schema, json, response.status);
};

interface GuestQuery {
  readonly page?: number | undefined;
  readonly pageSize?: number | undefined;
  readonly search?: string | undefined;
  readonly invitationStatus?: string | undefined;
  readonly guestType?: string | undefined;
  readonly ownerKey?: string | undefined;
}

const toQueryString = (query: GuestQuery): string => {
  const params = new URLSearchParams();
  if (query.page !== undefined) {
    params.set("page", String(query.page));
  }
  if (query.pageSize !== undefined) {
    params.set("pageSize", String(query.pageSize));
  }
  if (query.search !== undefined && query.search.trim().length > 0) {
    params.set("search", query.search.trim());
  }
  if (query.invitationStatus !== undefined && query.invitationStatus.length > 0) {
    params.set("invitationStatus", query.invitationStatus);
  }
  if (query.guestType !== undefined && query.guestType.length > 0) {
    params.set("guestType", query.guestType);
  }
  if (query.ownerKey !== undefined && query.ownerKey.length > 0) {
    params.set("ownerKey", query.ownerKey);
  }
  const next = params.toString();
  return next.length > 0 ? `?${next}` : "";
};

const adminLogin = (password: string): Promise<AdminLoginResponse> =>
  requestJson(AdminLoginResponseSchema, AdminRoutes.login, {
    method: "POST",
    body: JSON.stringify({ password }),
  });

const adminLogout = (): Promise<AdminLoginResponse> =>
  requestJson(AdminLoginResponseSchema, AdminRoutes.logout, { method: "POST" });

const listGuests = (query: GuestQuery): Promise<AdminListGuestsResponse> =>
  requestJson(AdminListGuestsResponseSchema, `${AdminRoutes.guests}${toQueryString(query)}`, { method: "GET" });

const createGuest = (input: AdminCreateGuestRequest): Promise<AdminGuest> =>
  requestJson(AdminGuestSchema, AdminRoutes.guests, { method: "POST", body: JSON.stringify(input) });

const updateGuest = (id: string, input: AdminUpdateGuestRequest): Promise<AdminGuest> =>
  requestJson(AdminGuestSchema, AdminRoutes.guestById(id), { method: "PATCH", body: JSON.stringify(input) });

const deleteGuest = (id: string): Promise<AdminDeleteGuestResponse> =>
  requestJson(AdminDeleteGuestResponseSchema, AdminRoutes.guestById(id), { method: "DELETE" });

const adminSession = (): Promise<AdminLoginResponse> =>
  requestJson(AdminLoginResponseSchema, AdminRoutes.session, { method: "GET" });

export { AdminApiError, adminLogin, adminLogout, adminSession, createGuest, deleteGuest, listGuests, updateGuest };
export type { GuestQuery };
