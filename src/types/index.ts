export type UserRole = 'STUDENT' | 'COORDINATOR' | 'ADMIN';

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  departmentId?: string;
  studentNumber?: string; // For students e.g. "CT-2024-8841"
  staffId?: string; // For staff e.g. "ST-101"
  phone?: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  headOfDepartment: string;
  building: string;
  defaultCoordinates?: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
}

export interface AcademicSemester {
  id: string;
  name: string; // e.g. "Fall 2026", "Spring 2026"
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Course {
  id: string;
  code: string; // e.g. "CS-301"
  name: string; // e.g. "Database Management Systems"
  departmentId: string;
  semesterId: string;
  credits: number;
  lecturerId?: string; // Legacy alias for coordinator
  lecturerName?: string; // Legacy alias for coordinator
  coordinatorId?: string; // User ID
  coordinatorName?: string;
  schedule: string; // e.g. "Mon, Wed 10:00 AM - 12:00 PM"
  room: string; // e.g. "Hall 302, Turing Lab"
  coordinates?: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
  totalClassesExpected: number;
  enrolledStudentIds: string[];
}

export interface AttendanceSession {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  lecturerId?: string;
  lecturerName?: string;
  coordinatorId?: string;
  coordinatorName?: string;
  semesterId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isOpen: boolean;
  lateThresholdMinutes: number; // e.g. 15 mins
  requireGeolocation: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
  currentToken: string; // Dynamic cryptographic temporary token
  tokenCreatedAt: number;
  tokenExpiresAt: number;
  refreshIntervalSeconds: number; // e.g. 15s or 30s
  totalEnrolled: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  courseId: string;
  courseCode: string;
  studentId: string; // User ID
  studentNumber: string;
  studentName: string;
  status: AttendanceStatus;
  checkInTime?: string; // ISO string
  minutesLate?: number;
  verificationMethod: 'QR_SCAN' | 'MANUAL_CORRECTION' | 'OFFLINE_SYNC';
  deviceInfo?: string;
  location?: {
    latitude: number;
    longitude: number;
    distanceMeters?: number;
    isValid: boolean;
  };
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AttendanceAuditLog {
  id: string;
  sessionId: string;
  recordId: string;
  courseId: string;
  courseCode: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  performedByUserId: string;
  performedByName: string;
  performedByRole: UserRole;
  action: string;
  oldStatus: AttendanceStatus | 'NONE';
  newStatus: AttendanceStatus;
  reason: string;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  userId: string; // Target user or 'ALL'
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ALERT';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface OfflineAttendanceQueueItem {
  id: string;
  token: string;
  sessionId: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  timestamp: string;
  coords?: {
    latitude: number;
    longitude: number;
  };
}

export interface CourseAttendanceSummary {
  courseId: string;
  courseCode: string;
  courseName: string;
  lecturerName: string;
  totalSessions: number;
  attendedSessions: number; // Present + Late
  presentSessions: number;
  lateSessions: number;
  absentSessions: number;
  excusedSessions: number;
  percentage: number;
}
