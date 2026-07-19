import { createAuthClient } from "better-auth/react";
import type { Paper, AuditEntry } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!apiUrl) {
  console.warn("NEXT_PUBLIC_API_URL is not defined!");
}

export const authClient = createAuthClient({
  baseURL: apiUrl ? apiUrl.replace("/api/v1", "") : "",
});

export const getBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_API_URL is not defined in the environment variables!");
  }
  return url.replace("/api/v1", "");
};

const getHeaders = () => {
  return {
    "Content-Type": "application/json",
  };
};

export async function fetchPapers(params?: { q?: string; status?: string; excludeStatus?: string; departmentId?: string; page?: number; limit?: number }) {
  const url = new URL(`${getBaseUrl()}/api/v1/papers`);
  if (params?.q) url.searchParams.append("q", params.q);
  if (params?.status) url.searchParams.append("status", params.status);
  if (params?.excludeStatus) url.searchParams.append("excludeStatus", params.excludeStatus);
  if (params?.page) url.searchParams.append("page", params.page.toString());
  if (params?.limit) url.searchParams.append("limit", params.limit.toString());

  const res = await fetch(url.toString(), {
    headers: getHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch papers");
  return res.json() as Promise<{ data: Paper[]; meta: any }>;
}

export async function fetchPaper(id: string) {
  const res = await fetch(`${getBaseUrl()}/api/v1/papers/${id}`, {
    headers: getHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch paper");
  return res.json() as Promise<{ data: Paper }>;
}

export async function createPaper(data: { title: string; body: string; departmentId?: string }) {
  const res = await fetch(`${getBaseUrl()}/api/v1/papers`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create paper");
  return res.json() as Promise<{ data: Paper }>;
}

export async function updatePaper(id: string, data: { title: string; body: string; currentVersion: number }) {
  const res = await fetch(`${getBaseUrl()}/api/v1/papers/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    if (res.status === 409) {
      throw new Error("Conflict: Optimistic Concurrency Error");
    }
    throw new Error("Failed to update paper");
  }
  return res.json() as Promise<{ data: Paper }>;
}

export async function transitionPaper(id: string, data: { targetStatus: string; currentVersion: number; reason?: string }) {
  const res = await fetch(`${getBaseUrl()}/api/v1/papers/${id}/transition`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    if (res.status === 409) {
      throw new Error("Conflict: Optimistic Concurrency Error");
    }
    throw new Error("Failed to transition paper");
  }
  return res.json() as Promise<{ data: Paper }>;
}

export async function assignReviewer(id: string, data: { reviewerId: string; currentVersion: number }) {
  const res = await fetch(`${getBaseUrl()}/api/v1/papers/${id}/assign`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    if (res.status === 409) {
      throw new Error("Conflict: Optimistic Concurrency Error");
    }
    throw new Error("Failed to assign reviewer");
  }
  return res.json() as Promise<{ data: Paper }>;
}

export async function fetchReviewers(departmentId?: string) {
  const url = new URL(`${getBaseUrl()}/api/v1/users/reviewers`);
  if (departmentId) url.searchParams.append("departmentId", departmentId);

  const res = await fetch(url.toString(), {
    headers: getHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch reviewers");
  return res.json() as Promise<{ data: { id: string, name: string, email: string, departmentId: string }[] }>;
}

export async function fetchAuditLogs(paperId?: string) {
  const url = new URL(`${getBaseUrl()}/api/v1/audit`);
  if (paperId) url.searchParams.append("paperId", paperId);

  const res = await fetch(url.toString(), {
    headers: getHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json() as Promise<{ data: AuditEntry[] }>;
}

export async function takeOwnership(id: string, data: { currentVersion: number }) {
  const res = await fetch(`${getBaseUrl()}/api/v1/papers/${id}/take-ownership`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    if (res.status === 409) {
      throw new Error("Conflict: Optimistic Concurrency Error");
    }
    throw new Error("Failed to take ownership");
  }
  return res.json() as Promise<{ data: Paper }>;
}

export async function deletePaper(id: string) {
  const res = await fetch(`${getBaseUrl()}/api/v1/papers/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
    credentials: "include",
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || json.message || "Failed to delete paper");
  }
  return res.json() as Promise<{ success: boolean }>;
}

export const api = {
  get: async (path: string) => {
    const res = await fetch(`${getBaseUrl()}/api/v1${path}`, { headers: getHeaders(), credentials: "include" });
    if (!res.ok) throw new Error(`GET ${path} failed`);
    return res.json();
  },
  post: async (path: string, body?: any) => {
    const res = await fetch(`${getBaseUrl()}/api/v1${path}`, {
      method: "POST",
      headers: getHeaders(),
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`POST ${path} failed`);
    return res.json();
  },
  put: async (path: string, body?: any) => {
    const res = await fetch(`${getBaseUrl()}/api/v1${path}`, {
      method: "PUT",
      headers: getHeaders(),
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`PUT ${path} failed`);
    return res.json();
  },
  delete: async (path: string) => {
    const res = await fetch(`${getBaseUrl()}/api/v1${path}`, { method: "DELETE", headers: getHeaders(), credentials: "include" });
    if (!res.ok) throw new Error(`DELETE ${path} failed`);
    return res.json();
  }
};
