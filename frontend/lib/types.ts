export type UserRole = "USER" | "ADMIN" | string;
export type UserStatus = "ACTIVE" | "BANNED" | string;
export type BorrowStatus = "BORROWED" | "RETURNED" | string;
export type ReservationStatus = "ACTIVE" | "CANCELLED" | "EXPIRED" | string;
export type ApiId = string | number;

export interface User {
  id: ApiId;
  email: string;
  name: string;
  phone?: string | null;
  registerNumber?: string | null;
  department?: string | null;
  semester?: string | null;
  year?: string | null;
  role: UserRole;
  status: UserStatus;
  verified: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Book {
  id: ApiId;
  title: string;
  author: string;
  description?: string | null;
  category: string;
  keywords?: string | null;
  coverUrl?: string | null;
  copiesTotal: number;
  copiesAvailable: number;
  featured: boolean;
}

export interface DonationRecord {
  id: ApiId;
  title: string;
  author: string;
  description?: string | null;
  copies: number;
  image1?: string | null;
  image2?: string | null;
  donorName?: string | null;
  createdAt: string;
}

export interface BorrowRecord {
  id: ApiId;
  book: Book;
  borrowedAt: string;
  dueAt: string;
  returnedAt?: string | null;
  status: BorrowStatus;
  fee: number;
}

export interface ReservationRecord {
  id: ApiId;
  book: Book;
  reservedAt: string;
  expiresAt: string;
  status: ReservationStatus;
}

export interface StudentResponse {
  registerNumber: string;
  name: string;
  department: string;
  semester: string;
  year: string;
}

export interface AnalyticsPoint {
  label: string;
  value: number;
}

export interface AnalyticsResponse {
  topBorrowed: AnalyticsPoint[];
  categoryPopularity: AnalyticsPoint[];
  borrowTrends: AnalyticsPoint[];
  reserveTrends: AnalyticsPoint[];
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AdminLoginPayload {
  username: string;
  password: string;
}

export interface GoogleLoginPayload {
  idToken: string;
}

export interface BookUpsertPayload {
  title: string;
  author: string;
  description?: string;
  category: string;
  keywords?: string;
  coverUrl?: string;
  copiesTotal: number;
  featured?: boolean;
}

export interface BorrowRequestPayload {
  bookId: ApiId;
}

export interface ReserveRequestPayload {
  bookId: ApiId;
}

export interface VerifyStudentPayload {
  registerNumber: string;
  name?: string;
  department?: string;
  semester?: string;
  year?: string;
}

export interface BanUserPayload {
  email?: string;
  registerNumber?: string;
}

export interface StudentRequestPayload {
  registerNumber: string;
  name: string;
  department: string;
  semester: string;
  year: string;
}
