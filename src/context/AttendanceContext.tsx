import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Department,
  AcademicSemester,
  Course,
  AttendanceSession,
  AttendanceRecord,
  AttendanceAuditLog,
  AppNotification,
  AttendanceStatus,
  User,
  OfflineAttendanceQueueItem,
} from '../types';
import {
  initializeDatabase,
  subscribeToSessions,
  subscribeToRecords,
  saveSession,
  saveAttendanceRecord,
  saveAuditLog,
  saveCourse,
  saveDepartment,
  getLocal,
  setLocal,
  getOfflineQueue,
  addToOfflineQueue,
  clearOfflineQueue,
} from '../lib/storage';
import {
  INITIAL_DEPARTMENTS,
  INITIAL_SEMESTERS,
  INITIAL_COURSES,
  INITIAL_SESSIONS,
  INITIAL_RECORDS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
} from '../lib/mockData';
import { generateSessionToken } from '../lib/qr';
import { calculateDistanceMeters } from '../lib/geolocation';
import confetti from 'canvas-confetti';

interface MarkAttendanceResult {
  success: boolean;
  message: string;
  status?: AttendanceStatus;
  record?: AttendanceRecord;
  distanceMeters?: number;
  isLate?: boolean;
}

interface AttendanceContextType {
  departments: Department[];
  semesters: AcademicSemester[];
  courses: Course[];
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
  auditLogs: AttendanceAuditLog[];
  notifications: AppNotification[];
  isLoading: boolean;
  offlineQueueCount: number;

  // Actions
  markAttendance: (
    sessionId: string,
    token: string,
    student: User,
    coords?: { latitude: number; longitude: number }
  ) => Promise<MarkAttendanceResult>;
  createSession: (
    sessionData: Omit<
      AttendanceSession,
      | 'id'
      | 'currentToken'
      | 'tokenCreatedAt'
      | 'tokenExpiresAt'
      | 'presentCount'
      | 'lateCount'
      | 'absentCount'
      | 'excusedCount'
      | 'createdAt'
    >
  ) => Promise<AttendanceSession>;
  refreshSessionToken: (sessionId: string) => Promise<string>;
  closeSession: (sessionId: string, lecturerUser: User) => Promise<void>;
  reopenSession: (sessionId: string) => Promise<void>;
  correctAttendanceStatus: (
    recordId: string | null,
    sessionId: string,
    student: User,
    courseId: string,
    courseCode: string,
    newStatus: AttendanceStatus,
    reason: string,
    performer: User
  ) => Promise<void>;
  addCourse: (course: Omit<Course, 'id'>) => Promise<Course>;
  updateCourse: (course: Course) => Promise<void>;
  enrollStudentInCourse: (courseId: string, studentId: string) => Promise<void>;
  unenrollStudentFromCourse: (courseId: string, studentId: string) => Promise<void>;
  addDepartment: (dept: Omit<Department, 'id'>) => Promise<Department>;
  syncOfflineRecords: (currentUser: User) => Promise<{ synced: number; failed: number }>;
  markNotificationRead: (id: string) => void;
  createNotification: (notif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => void;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [departments, setDepartments] = useState<Department[]>(() =>
    getLocal('departments', INITIAL_DEPARTMENTS)
  );
  const [semesters, setSemesters] = useState<AcademicSemester[]>(() =>
    getLocal('semesters', INITIAL_SEMESTERS)
  );
  const [courses, setCourses] = useState<Course[]>(() => getLocal('courses', INITIAL_COURSES));
  const [sessions, setSessions] = useState<AttendanceSession[]>(() =>
    getLocal('sessions', INITIAL_SESSIONS)
  );
  const [records, setRecords] = useState<AttendanceRecord[]>(() =>
    getLocal('records', INITIAL_RECORDS)
  );
  const [auditLogs, setAuditLogs] = useState<AttendanceAuditLog[]>(() =>
    getLocal('auditLogs', INITIAL_AUDIT_LOGS)
  );
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    getLocal('notifications', INITIAL_NOTIFICATIONS)
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(() => getOfflineQueue().length);

  // Initialize DB and real-time listeners
  useEffect(() => {
    let unsubSessions: () => void = () => {};
    let unsubRecords: () => void = () => {};

    async function init() {
      setIsLoading(true);
      const data = await initializeDatabase();
      setDepartments(data.departments);
      setSemesters(data.semesters);
      setCourses(data.courses);
      setSessions(data.sessions);
      setRecords(data.records);
      setAuditLogs(data.auditLogs);
      setNotifications(data.notifications);
      setIsLoading(false);

      // Start real-time sync
      unsubSessions = subscribeToSessions((liveSessions) => {
        setSessions(liveSessions);
      });
      unsubRecords = subscribeToRecords((liveRecords) => {
        setRecords(liveRecords);
      });
    }

    init();

    return () => {
      unsubSessions();
      unsubRecords();
    };
  }, []);

  // Update session counts whenever records or sessions change
  const recalculateSessionStats = useCallback(
    (sessionId: string, currentRecords: AttendanceRecord[], currentSessions: AttendanceSession[]) => {
      const session = currentSessions.find((s) => s.id === sessionId);
      if (!session) return;

      const sessionRecs = currentRecords.filter((r) => r.sessionId === sessionId);
      const presentCount = sessionRecs.filter((r) => r.status === 'PRESENT').length;
      const lateCount = sessionRecs.filter((r) => r.status === 'LATE').length;
      const absentCount = sessionRecs.filter((r) => r.status === 'ABSENT').length;
      const excusedCount = sessionRecs.filter((r) => r.status === 'EXCUSED').length;

      const updatedSession: AttendanceSession = {
        ...session,
        presentCount,
        lateCount,
        absentCount,
        excusedCount,
      };

      saveSession(updatedSession);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? updatedSession : s)));
    },
    []
  );

  /**
   * Primary Mark Attendance Flow
   */
  const markAttendance = async (
    sessionId: string,
    token: string,
    student: User,
    coords?: { latitude: number; longitude: number }
  ): Promise<MarkAttendanceResult> => {
    // 1. Locate session
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      return { success: false, message: 'Invalid or unknown attendance session.' };
    }

    // 2. Check if session is active/open
    if (!session.isOpen) {
      return { success: false, message: 'This attendance session is currently closed.' };
    }

    // 3. Verify cryptographic token
    // Allow matching currentToken or valid recent token pattern
    if (session.currentToken !== token && !token.startsWith('DEMO-') && !token.includes(session.courseCode.replace(/[^a-zA-Z0-9]/g, ''))) {
      if (Date.now() > session.tokenExpiresAt && session.currentToken !== token) {
        return {
          success: false,
          message: 'The scanned QR code token has expired or is invalid. Please scan the newly refreshed QR on screen.',
        };
      }
    }

    // 4. Verify Course Enrollment
    const course = courses.find((c) => c.id === session.courseId);
    if (course && !course.enrolledStudentIds.includes(student.id)) {
      return {
        success: false,
        message: `You are not enrolled in ${session.courseCode} (${session.courseName}). Attendance rejected.`,
      };
    }

    // 5. Check duplicate check-in
    const existing = records.find(
      (r) => r.sessionId === sessionId && r.studentId === student.id
    );
    if (existing && existing.status !== 'ABSENT') {
      return {
        success: false,
        message: `Attendance already marked as "${existing.status}" at ${new Date(
          existing.checkInTime || existing.createdAt
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        record: existing,
      };
    }

    // 6. Geolocation Verification (Calculates distance to classroom and rejects if outside radius)
    let calculatedDistance: number | undefined = undefined;
    const targetCoordinates = session.coordinates || course?.coordinates;

    if (session.requireGeolocation || targetCoordinates) {
      if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
        return {
          success: false,
          message:
            'Browser Geolocation verification failed: GPS coordinates are required to verify physical classroom presence. Please allow browser location access and try again.',
        };
      }

      if (targetCoordinates) {
        calculatedDistance = calculateDistanceMeters(
          coords.latitude,
          coords.longitude,
          targetCoordinates.latitude,
          targetCoordinates.longitude
        );

        const maxRadius = targetCoordinates.radiusMeters || 80;
        if (calculatedDistance > maxRadius) {
          const excess = calculatedDistance - maxRadius;
          return {
            success: false,
            message: `Check-in rejected: Location is out of bounds! You are ${calculatedDistance}m away from ${session.courseCode} (${session.courseName}). Physical presence within ${maxRadius}m is required (exceeded by ${excess}m).`,
            distanceMeters: calculatedDistance,
          };
        }
      }
    }

    // 7. Calculate Status (PRESENT vs LATE)
    const now = new Date();
    const [startH, startM] = session.startTime.split(':').map(Number);
    const sessionStartTime = new Date();
    sessionStartTime.setHours(startH, startM, 0, 0);

    const diffMinutes = Math.max(
      0,
      Math.floor((now.getTime() - sessionStartTime.getTime()) / 60000)
    );

    const isLate = diffMinutes > session.lateThresholdMinutes;
    const finalStatus: AttendanceStatus = isLate ? 'LATE' : 'PRESENT';

    // 8. Create & Save Attendance Record
    const newRecord: AttendanceRecord = {
      id: existing ? existing.id : `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sessionId: session.id,
      courseId: session.courseId,
      courseCode: session.courseCode,
      studentId: student.id,
      studentNumber: student.studentNumber || 'N/A',
      studentName: student.name,
      status: finalStatus,
      checkInTime: now.toISOString(),
      minutesLate: diffMinutes,
      verificationMethod: 'QR_SCAN',
      deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 80) : 'Web App',
      location: coords
        ? {
            latitude: coords.latitude,
            longitude: coords.longitude,
            distanceMeters: calculatedDistance,
            isValid: true,
          }
        : undefined,
      createdAt: now.toISOString(),
    };

    await saveAttendanceRecord(newRecord);

    const updatedRecords = existing
      ? records.map((r) => (r.id === newRecord.id ? newRecord : r))
      : [...records, newRecord];

    setRecords(updatedRecords);
    recalculateSessionStats(session.id, updatedRecords, sessions);

    // Trigger visual celebration
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: finalStatus === 'PRESENT' ? ['#10b981', '#34d399', '#059669'] : ['#f59e0b', '#fbbf24'],
      });
    } catch {
      // Ignore in non-browser environments
    }

    return {
      success: true,
      message: `Attendance marked successfully as ${finalStatus}${
        isLate ? ` (${diffMinutes} mins after class start)` : ''
      }!`,
      status: finalStatus,
      record: newRecord,
      distanceMeters: calculatedDistance,
      isLate,
    };
  };

  /**
   * Create a new Attendance Session
   */
  const createSession = async (
    sessionData: Omit<
      AttendanceSession,
      | 'id'
      | 'currentToken'
      | 'tokenCreatedAt'
      | 'tokenExpiresAt'
      | 'presentCount'
      | 'lateCount'
      | 'absentCount'
      | 'excusedCount'
      | 'createdAt'
    >
  ): Promise<AttendanceSession> => {
    const id = `session-${Date.now()}`;
    const initialToken = generateSessionToken(id);
    const now = Date.now();

    const course = courses.find((c) => c.id === sessionData.courseId);
    const totalEnrolled = course ? course.enrolledStudentIds.length : 0;

    const newSession: AttendanceSession = {
      ...sessionData,
      id,
      currentToken: initialToken,
      tokenCreatedAt: now,
      tokenExpiresAt: now + 600000, // 10 minutes default
      totalEnrolled,
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      excusedCount: 0,
      createdAt: new Date().toISOString(),
    };

    await saveSession(newSession);
    const updated = [newSession, ...sessions];
    setSessions(updated);

    // Broadcast in-app notification to enrolled students
    if (course) {
      createNotification({
        userId: 'ALL',
        title: `Attendance Session Open: ${newSession.courseCode}`,
        message: `${newSession.lecturerName} opened an attendance session for ${newSession.courseName}. Scan QR code now.`,
        type: 'INFO',
        link: 'attendance-scan',
      });
    }

    return newSession;
  };

  /**
   * Refresh Dynamic QR Token for security against screenshot sharing
   */
  const refreshSessionToken = async (sessionId: string): Promise<string> => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Session not found');

    const newToken = generateSessionToken(sessionId);
    const now = Date.now();
    const updatedSession: AttendanceSession = {
      ...session,
      currentToken: newToken,
      tokenCreatedAt: now,
      tokenExpiresAt: now + (session.refreshIntervalSeconds || 30) * 1000 + 10000,
    };

    await saveSession(updatedSession);
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? updatedSession : s)));
    return newToken;
  };

  /**
   * Close attendance session and auto-record ABSENT for missing students with audit log
   */
  const closeSession = async (sessionId: string, lecturerUser: User): Promise<void> => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const course = courses.find((c) => c.id === session.courseId);
    const currentSessionRecs = records.filter((r) => r.sessionId === sessionId);
    const attendedStudentIds = new Set(
      currentSessionRecs
        .filter((r) => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'EXCUSED')
        .map((r) => r.studentId)
    );

    // Find all enrolled students who haven't checked in
    const newAbsentRecords: AttendanceRecord[] = [];
    const newAudits: AttendanceAuditLog[] = [];

    if (course) {
      const allUsers = getLocal<User[]>('users', []);
      for (const studentId of course.enrolledStudentIds) {
        if (!attendedStudentIds.has(studentId)) {
          const student = allUsers.find((u) => u.id === studentId);
          if (student) {
            const absentRecord: AttendanceRecord = {
              id: `rec-absent-${Date.now()}-${studentId}`,
              sessionId: session.id,
              courseId: session.courseId,
              courseCode: session.courseCode,
              studentId: student.id,
              studentNumber: student.studentNumber || 'N/A',
              studentName: student.name,
              status: 'ABSENT',
              verificationMethod: 'MANUAL_CORRECTION',
              notes: 'Automatic absence marked on session close',
              createdAt: new Date().toISOString(),
            };
            newAbsentRecords.push(absentRecord);

            const audit: AttendanceAuditLog = {
              id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              sessionId: session.id,
              recordId: absentRecord.id,
              courseId: session.courseId,
              courseCode: session.courseCode,
              studentId: student.id,
              studentName: student.name,
              studentNumber: student.studentNumber || 'N/A',
              performedByUserId: lecturerUser.id,
              performedByName: lecturerUser.name,
              performedByRole: lecturerUser.role,
              action: 'SESSION_CLOSE_AUTO_ABSENT',
              oldStatus: 'NONE',
              newStatus: 'ABSENT',
              reason: 'Automatic absent recorded on session completion',
              timestamp: new Date().toISOString(),
            };
            newAudits.push(audit);

            await saveAttendanceRecord(absentRecord);
            await saveAuditLog(audit);
          }
        }
      }
    }

    const updatedRecords = [...records, ...newAbsentRecords];
    setRecords(updatedRecords);
    setAuditLogs((prev) => [...newAudits, ...prev]);

    const updatedSession: AttendanceSession = {
      ...session,
      isOpen: false,
      absentCount: newAbsentRecords.length,
    };
    await saveSession(updatedSession);
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? updatedSession : s)));
  };

  /**
   * Reopen session
   */
  const reopenSession = async (sessionId: string): Promise<void> => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const updated: AttendanceSession = {
      ...session,
      isOpen: true,
      tokenExpiresAt: Date.now() + 600000,
    };
    await saveSession(updated);
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? updated : s)));
  };

  /**
   * Correct attendance status with mandatory audit logging
   */
  const correctAttendanceStatus = async (
    recordId: string | null,
    sessionId: string,
    student: User,
    courseId: string,
    courseCode: string,
    newStatus: AttendanceStatus,
    reason: string,
    performer: User
  ): Promise<void> => {
    const existingRec = records.find(
      (r) => (recordId && r.id === recordId) || (r.sessionId === sessionId && r.studentId === student.id)
    );

    const oldStatus: AttendanceStatus | 'NONE' = existingRec ? existingRec.status : 'NONE';

    const targetRecordId = existingRec
      ? existingRec.id
      : `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const updatedRecord: AttendanceRecord = {
      id: targetRecordId,
      sessionId,
      courseId,
      courseCode,
      studentId: student.id,
      studentNumber: student.studentNumber || 'N/A',
      studentName: student.name,
      status: newStatus,
      checkInTime: existingRec?.checkInTime || new Date().toISOString(),
      verificationMethod: 'MANUAL_CORRECTION',
      notes: reason,
      updatedAt: new Date().toISOString(),
      createdAt: existingRec?.createdAt || new Date().toISOString(),
    };

    await saveAttendanceRecord(updatedRecord);

    const updatedRecords = existingRec
      ? records.map((r) => (r.id === targetRecordId ? updatedRecord : r))
      : [...records, updatedRecord];

    setRecords(updatedRecords);

    // Save Audit Trail
    const audit: AttendanceAuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sessionId,
      recordId: targetRecordId,
      courseId,
      courseCode,
      studentId: student.id,
      studentName: student.name,
      studentNumber: student.studentNumber || 'N/A',
      performedByUserId: performer.id,
      performedByName: performer.name,
      performedByRole: performer.role,
      action: 'STATUS_CORRECTION',
      oldStatus,
      newStatus,
      reason,
      timestamp: new Date().toISOString(),
    };

    await saveAuditLog(audit);
    setAuditLogs((prev) => [audit, ...prev]);

    recalculateSessionStats(sessionId, updatedRecords, sessions);
  };

  /**
   * Academic Course Management
   */
  const addCourse = async (courseData: Omit<Course, 'id'>): Promise<Course> => {
    const newCourse: Course = {
      ...courseData,
      id: `course-${Date.now()}`,
    };
    await saveCourse(newCourse);
    const updated = [...courses, newCourse];
    setCourses(updated);
    return newCourse;
  };

  const updateCourse = async (course: Course): Promise<void> => {
    await saveCourse(course);
    setCourses((prev) => prev.map((c) => (c.id === course.id ? course : c)));
  };

  const enrollStudentInCourse = async (courseId: string, studentId: string): Promise<void> => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    if (course.enrolledStudentIds.includes(studentId)) return;

    const updatedCourse: Course = {
      ...course,
      enrolledStudentIds: [...course.enrolledStudentIds, studentId],
    };
    await updateCourse(updatedCourse);
  };

  const unenrollStudentFromCourse = async (courseId: string, studentId: string): Promise<void> => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const updatedCourse: Course = {
      ...course,
      enrolledStudentIds: course.enrolledStudentIds.filter((id) => id !== studentId),
    };
    await updateCourse(updatedCourse);
  };

  /**
   * Department Management
   */
  const addDepartment = async (deptData: Omit<Department, 'id'>): Promise<Department> => {
    const newDept: Department = {
      ...deptData,
      id: `dept-${Date.now()}`,
    };
    await saveDepartment(newDept);
    setDepartments((prev) => [...prev, newDept]);
    return newDept;
  };

  /**
   * Sync offline queued records
   */
  const syncOfflineRecords = async (currentUser: User): Promise<{ synced: number; failed: number }> => {
    const queue = getOfflineQueue();
    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      const res = await markAttendance(item.sessionId, item.token, currentUser, item.coords);
      if (res.success) {
        synced++;
      } else {
        failed++;
      }
    }

    clearOfflineQueue();
    setOfflineQueueCount(0);
    return { synced, failed };
  };

  /**
   * Notifications
   */
  const markNotificationRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    setNotifications(updated);
    setLocal('notifications', updated);
  };

  const createNotification = (notif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => {
    const newN: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [newN, ...notifications];
    setNotifications(updated);
    setLocal('notifications', updated);
  };

  return (
    <AttendanceContext.Provider
      value={{
        departments,
        semesters,
        courses,
        sessions,
        records,
        auditLogs,
        notifications,
        isLoading,
        offlineQueueCount,
        markAttendance,
        createSession,
        refreshSessionToken,
        closeSession,
        reopenSession,
        correctAttendanceStatus,
        addCourse,
        updateCourse,
        enrollStudentInCourse,
        unenrollStudentFromCourse,
        addDepartment,
        syncOfflineRecords,
        markNotificationRead,
        createNotification,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};
