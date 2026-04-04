import type {
  AdminLoginPayload,
  AnalyticsResponse,
  AuthResponse,
  BanUserPayload,
  Book,
  BookUpsertPayload,
  BorrowRecord,
  BorrowRequestPayload,
  DonationRecord,
  GoogleLoginPayload,
  LoginPayload,
  RegisterPayload,
  ReservationRecord,
  ReserveRequestPayload,
  StudentRequestPayload,
  StudentResponse,
  User,
  VerifyStudentPayload,
} from "@/lib/types";
import { supabase } from "@/lib/supabase";

const REQUEST_TIMEOUT_MS = 15000;

const CLOUD_API_BASE_URL =
  "https://gttclms-bvcyaudmh0ecebg5.centralindia-01.azurewebsites.net";
const LOCAL_API_BASE_URL = "http://localhost:8080";

function isBrowser() {
  return typeof window !== "undefined";
}

function isLocalDevelopmentHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized.endsWith(".github.dev") ||
    normalized.endsWith(".app.github.dev")
  );
}

function getDefaultApiBaseUrl() {
  if (!isBrowser()) {
    return CLOUD_API_BASE_URL;
  }

  return isLocalDevelopmentHost(window.location.hostname)
    ? LOCAL_API_BASE_URL
    : CLOUD_API_BASE_URL;
}

const RAW_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  getDefaultApiBaseUrl();

function normalizeApiBaseUrl(rawValue: string) {
  const value = rawValue.trim().replace(/^['"]|['"]$/g, "");

  if (!value || value.startsWith("/") || value.startsWith(".")) {
    return getDefaultApiBaseUrl();
  }

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const parsed = new URL(candidate);
    return `${parsed.protocol}//${parsed.host}`.replace(/\/$/, "");
  } catch {
    return getDefaultApiBaseUrl();
  }
}

const API_BASE_URL = normalizeApiBaseUrl(RAW_API_BASE_URL);

function getResolvedBaseUrl() {
  if (/^https?:\/\//i.test(API_BASE_URL)) {
    return API_BASE_URL;
  }

  if (isBrowser()) {
    return new URL(API_BASE_URL, window.location.origin).toString();
  }

  return getDefaultApiBaseUrl();
}

function getApiOrigin() {
  const url = new URL(getResolvedBaseUrl());
  return `${url.protocol}//${url.host}`;
}

function buildUrl(path: string, params?: Record<string, unknown>) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalized, `${getResolvedBaseUrl()}/`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

function looksLikeHtmlDocument(value: string) {
  const normalized = value.trim().slice(0, 200).toLowerCase();
  return (
    normalized.startsWith("<!doctype html") || normalized.startsWith("<html")
  );
}

function extractApiMessage(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload.trim()) {
    if (looksLikeHtmlDocument(payload)) {
      return `${fallback}. API returned HTML instead of JSON; check backend API URL configuration.`;
    }
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const response = payload as {
    message?: unknown;
    error?: unknown;
    details?: unknown;
  };

  if (typeof response.message === "string" && response.message.trim()) {
    return response.message;
  }

  if (typeof response.error === "string" && response.error.trim()) {
    return response.error;
  }

  if (typeof response.details === "string" && response.details.trim()) {
    return response.details;
  }

  return fallback;
}

async function getActiveAuthToken() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return null;
    }
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function hasActiveSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return false;
    }
    return Boolean(data.session?.access_token);
  } catch {
    return false;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  fallbackMessage = "Request failed",
  params?: Record<string, unknown>,
  includeAuth = true,
  authTokenOverride?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  let token = includeAuth
    ? (authTokenOverride ?? (await getActiveAuthToken()))
    : null;

  if (includeAuth && !token && !authTokenOverride) {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      token = error ? null : (data.session?.access_token ?? null);
    } catch {
      token = null;
    }
  }

  if (includeAuth && !token) {
    throw new Error("Authentication required");
  }

  const isFormBody =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const send = async (activeToken: string | null) => {
    const requestHeaders = new Headers(headers);

    if (activeToken) {
      requestHeaders.set("Authorization", `Bearer ${activeToken}`);
    }

    if (!isFormBody && options.body && !requestHeaders.has("Content-Type")) {
      requestHeaders.set("Content-Type", "application/json");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      return await fetch(buildUrl(path, params), {
        ...options,
        headers: requestHeaders,
        signal: options.signal || controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  let response: Response;

  try {
    response = await send(token);
  } catch (error) {
    const isAbortError =
      error instanceof DOMException && error.name === "AbortError";
    if (isAbortError) {
      throw new Error(`${fallbackMessage} (timeout)`);
    }
    throw new Error(fallbackMessage);
  }

  if (includeAuth && response.status === 401 && !authTokenOverride) {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      const refreshedToken = error
        ? null
        : (data.session?.access_token ?? null);

      if (refreshedToken) {
        response = await send(refreshedToken);
      }
    } catch {
      // keep original 401 response when refresh fails
    }
  }

  const raw = await response.text();
  let payload: unknown = undefined;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = raw;
    }
  }

  if (!response.ok) {
    if (includeAuth && response.status === 401) {
      const stillAuthenticated = await hasActiveSession();
      const fallback = stillAuthenticated
        ? "Unauthorized for this request"
        : "Session expired. Please login again.";
      throw new Error(extractApiMessage(payload, fallback));
    }

    if (includeAuth && response.status === 403) {
      throw new Error(extractApiMessage(payload, "Access denied"));
    }

    throw new Error(
      extractApiMessage(
        payload,
        `${fallbackMessage}${response.status ? ` (${response.status})` : ""}`,
      ),
    );
  }

  return payload as T;
}

function normalizeBookPayload(payload: BookUpsertPayload) {
  return {
    title: payload.title.trim(),
    author: payload.author.trim(),
    description: payload.description?.trim() || "",
    category: payload.category.trim(),
    keywords: payload.keywords?.trim() || "",
    coverUrl: payload.coverUrl?.trim() || "",
    copiesTotal: Math.max(1, Number(payload.copiesTotal || 1)),
    featured: Boolean(payload.featured),
  };
}

type DonationSubmitPayload = {
  title: string;
  author: string;
  description?: string;
  copies: number;
  image1?: File;
  image2?: File;
};

function isFormDataPayload(
  payload: FormData | DonationSubmitPayload,
): payload is FormData {
  return typeof FormData !== "undefined" && payload instanceof FormData;
}

function normalizeDonationPayload(payload: DonationSubmitPayload) {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("author", payload.author);
  formData.append("description", payload.description || "");
  formData.append("copies", String(payload.copies));

  if (payload.image1) {
    formData.append("image1", payload.image1);
  }
  if (payload.image2) {
    formData.append("image2", payload.image2);
  }

  return formData;
}

export const api = {
  register(payload: RegisterPayload) {
    return request<AuthResponse>(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "Unable to register",
      undefined,
      false,
    );
  },

  login(payload: LoginPayload) {
    return request<AuthResponse>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "Unable to login",
      undefined,
      false,
    );
  },

  adminLogin(payload: AdminLoginPayload) {
    return request<AuthResponse>(
      "/api/admin/login",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "Unable to login as admin",
      undefined,
      false,
    );
  },

  googleLogin(idToken: string | GoogleLoginPayload) {
    const payload: GoogleLoginPayload =
      typeof idToken === "string" ? { idToken } : idToken;

    return request<AuthResponse>(
      "/api/auth/google",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "Unable to login with Google",
      undefined,
      false,
    );
  },

  getMe(authTokenOverride?: string | null) {
    return request<User>(
      "/api/users/me",
      {},
      "Unable to load profile",
      undefined,
      true,
      authTokenOverride,
    );
  },

  getBooks(params?: { q?: string; category?: string; featured?: boolean }) {
    return request<Book[]>(
      "/api/books",
      {},
      "Unable to load books",
      params,
      false,
    );
  },

  getBook(id: string | number) {
    return request<Book>(
      `/api/books/${id}`,
      {},
      "Unable to load book",
      undefined,
      false,
    );
  },

  createBook(payload: BookUpsertPayload) {
    return request<Book>(
      "/api/books",
      {
        method: "POST",
        body: JSON.stringify(normalizeBookPayload(payload)),
      },
      "Unable to create book",
    );
  },

  updateBook(id: string | number, payload: BookUpsertPayload) {
    return request<Book>(
      `/api/books/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(normalizeBookPayload(payload)),
      },
      "Unable to update book",
    );
  },

  async deleteBook(id: string | number) {
    await request<void>(
      `/api/books/${id}`,
      {
        method: "DELETE",
      },
      "Unable to delete book",
    );
  },

  getFavorites() {
    return request<Book[]>("/api/favorites/me", {}, "Unable to load favorites");
  },

  async addFavorite(bookId: string | number) {
    await request<void>(
      `/api/favorites/${bookId}`,
      {
        method: "POST",
      },
      "Unable to add favorite",
    );
  },

  async removeFavorite(bookId: string | number) {
    await request<void>(
      `/api/favorites/${bookId}`,
      {
        method: "DELETE",
      },
      "Unable to remove favorite",
    );
  },

  borrowBook(bookId: string | number) {
    const payload: BorrowRequestPayload = { bookId };
    return request<BorrowRecord>(
      "/api/borrows",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "Unable to borrow book",
    );
  },

  reserveBook(bookId: string | number) {
    const payload: ReserveRequestPayload = { bookId };
    return request<ReservationRecord>(
      "/api/reservations",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "Unable to reserve book",
    );
  },

  getMyBorrows() {
    return request<BorrowRecord[]>(
      "/api/borrows/me",
      {},
      "Unable to load borrowed books",
    );
  },

  returnBorrow(borrowId: string | number) {
    return request<BorrowRecord>(
      `/api/borrows/${borrowId}/return`,
      {
        method: "POST",
      },
      "Unable to return book",
    );
  },

  getMyReservations() {
    return request<ReservationRecord[]>(
      "/api/reservations/me",
      {},
      "Unable to load reservations",
    );
  },

  cancelReservation(reservationId: string | number) {
    return request<ReservationRecord>(
      `/api/reservations/${reservationId}/cancel`,
      {
        method: "POST",
      },
      "Unable to cancel reservation",
    );
  },

  submitDonation(payload: FormData | DonationSubmitPayload) {
    const formData = isFormDataPayload(payload)
      ? payload
      : normalizeDonationPayload(payload);

    return request<DonationRecord>(
      "/api/donations",
      {
        method: "POST",
        body: formData,
      },
      "Unable to submit donation",
    );
  },

  getMyDonations() {
    return request<DonationRecord[]>(
      "/api/donations/me",
      {},
      "Unable to load your donations",
    );
  },

  getAllDonations() {
    return request<DonationRecord[]>(
      "/api/donations",
      {},
      "Unable to load donations",
      undefined,
      false,
    );
  },

  getAdminAnalytics() {
    return request<AnalyticsResponse>(
      "/api/admin/analytics",
      {},
      "Unable to load analytics",
    );
  },

  getAdminUsers() {
    return request<User[]>("/api/users", {}, "Unable to load users");
  },

  addStudent(payload: StudentRequestPayload) {
    return request<StudentResponse>(
      "/api/admin/students",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "Unable to add student",
    );
  },

  uploadStudents(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return request<StudentResponse[]>(
      "/api/admin/students/upload",
      {
        method: "POST",
        body: formData,
      },
      "Unable to upload students",
    );
  },

  banUser(payload: BanUserPayload) {
    return request<User>(
      "/api/users/ban",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "Unable to ban user",
    );
  },

  async deleteUser(userId: string | number) {
    await request<void>(
      `/api/users/${userId}`,
      {
        method: "DELETE",
      },
      "Unable to delete user",
    );
  },

  lookupStudent(registerNumber: string) {
    return request<StudentResponse>(
      `/api/students/${encodeURIComponent(registerNumber)}`,
      {},
      "Unable to find student",
      undefined,
      false,
    );
  },

  verifyStudent(payload: VerifyStudentPayload) {
    return request<User>(
      "/api/users/verify",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "Unable to verify student",
    );
  },
};

export function getUploadUrl(path: string | null | undefined) {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiOrigin()}${normalized}`;
}
