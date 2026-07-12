export type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN" | string;
export type UserStatus = "ACTIVE" | "BANNED" | string;
export type BorrowStatus = "BORROWED" | "RETURNED" | string;
export type ReservationStatus = "ACTIVE" | "CANCELLED" | "EXPIRED" | string;
export type ApiId = string | number;

export interface User {
  id: ApiId;
  email: string;
  name: string;
  avatarUrl?: string | null;
  phone?: string | null;
  registerNumber?: string | null;
  department?: string | null;
  semester?: string | null;
  year?: string | null;
  role: UserRole;
  status: UserStatus;
  verified: boolean;
  faceVerified: boolean;
  faceVerifiedAt?: string | null;
  faceImageAvailable: boolean;
}

export interface TopicVideo {
  id: string;
  title: string;
  subject: string;
  department: string;
  semester: string;
  year: string;
  videoUrl: string;
  createdAt: string;
}

export interface TopicVideoComment {
  id: string;
  videoId: string;
  userId: string;
  comment: string;
  commentedBy?: string | null;
  createdAt: string;
}

export interface TopicVideoCreatePayload {
  title: string;
  subject: string;
  department: string;
  semester: string;
  year: string;
  videoUrl: string;
}

export interface TopicVideoCommentCreatePayload {
  comment: string;
}

export interface FaceVerificationPayload {
  imageDataUrl: string;
  sessionToken?: string;
}

export interface FaceVerificationSessionCreatePayload {
  redirectPath?: string;
}

export interface FaceVerificationSession {
  token: string;
  status: "PENDING" | "COMPLETED" | "EXPIRED" | string;
  redirectPath: string;
  verificationUrl: string;
  expiresAt: string;
  completedAt?: string | null;
}

export interface ChatbotMessagePayload {
  message: string;
  senderId?: string;
}

export interface ChatbotMessageResponse {
  reply: string;
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
  digital?: boolean;
  pdfUrl?: string | null;
  uploadedByUserId?: string | null;
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
  approved: boolean;
  approvedBookId?: string | null;
  approvedAt?: string | null;
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

export interface DigitalBookCreatePayload {
  title: string;
  author: string;
  description?: string;
  pdfUrl?: string;
  pdfFile?: File;
  coverImage?: File;
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
  id?: ApiId;
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

export interface QuestionPaper {
  id: ApiId;
  subjectName: string;
  department: string;
  semester: string;
  academicYear: string;
  questionPaperYear: string;
  pdfUrl: string;
  createdAt: string;
}

export interface StudyNote {
  id: ApiId;
  subjectName: string;
  department: string;
  semester: string;
  academicYear: string;
  unitNumbers: string;
  pdfUrl: string;
  createdAt: string;
}

export interface QuestionPaperCreatePayload {
  subjectName: string;
  department: string;
  semester: string;
  academicYear: string;
  questionPaperYear: string;
  pdfUrl?: string;
  pdfFile?: File;
}

export type QuestionPaperUpdatePayload = QuestionPaperCreatePayload;

export interface StudyNoteCreatePayload {
  subjectName: string;
  department: string;
  semester: string;
  academicYear: string;
  unitNumbers: string;
  pdfUrl?: string;
  pdfFile?: File;
}

export type StudyNoteUpdatePayload = StudyNoteCreatePayload;

export interface DataAnalysisStoredFile {
  id: ApiId;
  originalFileName: string;
  cleanedFileName: string;
  fileFormat: string;
  downloadUrl: string;
  emailSent?: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface DataAnalysisCleanedFilePayload {
  file: File;
  originalFileName?: string;
  format?: "csv" | "xlsx";
  sendEmail?: boolean;
}

export interface WebScrapeRequestPayload {
  url: string;
  includeTitle?: boolean;
  includeHeadings?: boolean;
  includeParagraphs?: boolean;
  includeLinks?: boolean;
  includeTables?: boolean;
}

export interface WebScrapeLinkItem {
  text: string;
  url: string;
}

export interface WebScrapeTableItem {
  headers: string[];
  rows: string[][];
}

export interface WebScrapeResponse {
  url: string;
  title?: string | null;
  headings: string[];
  paragraphs: string[];
  links: WebScrapeLinkItem[];
  tables: WebScrapeTableItem[];
}

export interface WebScrapeExportPayload {
  fileName: string;
  format: "pdf" | "docx";
  url: string;
  title?: string | null;
  headings: string[];
  paragraphs: string[];
  links: WebScrapeLinkItem[];
  tables: WebScrapeTableItem[];
  sendEmail?: boolean;
}

// Departments
export interface Department {
  id: ApiId;
  slug: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  published: boolean;
  createdAt?: string;
}

export interface DepartmentResource {
  id: ApiId;
  departmentId: ApiId;
  title: string;
  description?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  folder?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
}

export interface DepartmentSearchResult {
  department: Department;
  folder?: string | null;
  resource: DepartmentResource;
}
