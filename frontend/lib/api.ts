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

const AUTH_TOKEN_KEY = "gttc_lms_auth_token";
const LEGACY_AUTH_TOKEN_KEY = "token";

const DEFAULT_API_BASE_URL =
  "https://gttclms-bvcyaudmh0ecebg5.centralindia-01.azurewebsites.net";

const RAW_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  DEFAULT_API_BASE_URL;

const KNOWN_FRONTEND_HOSTS = new Set(["gttclms.vercel.app"]);

function normalizeApiBaseUrl(rawValue: string) {
  const value = rawValue.trim().replace(/^['"]|['"]$/g, "");

  if (!value || value.startsWith("/") || value.startsWith(".")) {
    return DEFAULT_API_BASE_URL;
  }

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const parsed = new URL(candidate);

    if (KNOWN_FRONTEND_HOSTS.has(parsed.hostname.toLowerCase())) {
      return DEFAULT_API_BASE_URL;
    }

    if (isBrowser() && parsed.host === window.location.host) {
      return DEFAULT_API_BASE_URL;
    }

    return `${parsed.protocol}//${parsed.host}`.replace(/\/$/, "");
  } catch {
    return DEFAULT_API_BASE_URL;
  }
}

const API_BASE_URL = normalizeApiBaseUrl(RAW_API_BASE_URL);

function isBrowser() {
  return typeof window !== "undefined";
}

function getResolvedBaseUrl() {
  if (/^https?:\/\//i.test(API_BASE_URL)) {
    return API_BASE_URL;
  }

  if (isBrowser()) {
    return new URL(API_BASE_URL, window.location.origin).toString();
  }

  return DEFAULT_API_BASE_URL;
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
  const storedToken = getStoredAuthToken();
  if (storedToken || !isBrowser()) {
    return storedToken;
  }

  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return null;
    }

    const sessionToken = data.session?.access_token ?? null;
    if (sessionToken) {
      setStoredAuthToken(sessionToken);
    }
    return sessionToken;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  fallbackMessage = "Request failed",
  params?: Record<string, unknown>,
  includeAuth = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  const token = includeAuth ? await getActiveAuthToken() : null;
  const isFormBody =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!isFormBody && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path, params), {
    ...options,
    headers,
  });

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

export function getStoredAuthToken() {
  if (!isBrowser()) {
    return null;
  }
  return (
    localStorage.getItem(AUTH_TOKEN_KEY) ||
    localStorage.getItem(LEGACY_AUTH_TOKEN_KEY)
  );
}

export function setStoredAuthToken(token: string | null) {
  if (!isBrowser()) {
    return;
  }

  if (!token) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
    return;
  }

  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(LEGACY_AUTH_TOKEN_KEY, token);
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
    );
  },

  getMe() {
    return request<User>("/api/users/me", {}, "Unable to load profile");
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
    return request<Book>(`/api/books/${id}`, {}, "Unable to load book");
  },

  createBook(payload: BookUpsertPayload) {
    return request<Book>(
      "/api/books",
      {
        method: "POST",
        body: JSON.stringify(normalizeBookPayload(payload)),
      },
      "Unable to create book",
      undefined,
      false,
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
      undefined,
      false,
    );
  },

  async deleteBook(id: string | number) {
    await request<void>(
      `/api/books/${id}`,
      {
        method: "DELETE",
      },
      "Unable to delete book",
      undefined,
      false,
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
      undefined,
      false,
    );
  },

  getAdminUsers() {
    return request<User[]>(
      "/api/users",
      {},
      "Unable to load users",
      undefined,
      false,
    );
  },

  addStudent(payload: StudentRequestPayload) {
    return request<StudentResponse>(
      "/api/admin/students",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      "Unable to add student",
      undefined,
      false,
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
      undefined,
      false,
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
      undefined,
      false,
    );
  },

  async deleteUser(userId: string | number) {
    await request<void>(
      `/api/users/${userId}`,
      {
        method: "DELETE",
      },
      "Unable to delete user",
      undefined,
      false,
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
      undefined,
      false,
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
