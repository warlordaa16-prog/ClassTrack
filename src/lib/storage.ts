import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Department,
  AcademicSemester,
  User,
  Course,
  AttendanceSession,
  AttendanceRecord,
  AttendanceAuditLog,
  AppNotification,
  OfflineAttendanceQueueItem,
} from '../types';
import {
  INITIAL_DEPARTMENTS,
  INITIAL_SEMESTERS,
  INITIAL_USERS,
  INITIAL_COURSES,
  INITIAL_SESSIONS,
  INITIAL_RECORDS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
} from './mockData';

const LOCAL_STORAGE_PREFIX = 'classtrack_';

export function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error('Error reading localStorage key', key, err);
    return fallback;
  }
}

export function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.error('Error writing localStorage key', key, err);
  }
}

/**
 * Initialize Firestore data if empty, else load existing
 */
export async function initializeDatabase(): Promise<{
  departments: Department[];
  semesters: AcademicSemester[];
  users: User[];
  courses: Course[];
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
  auditLogs: AttendanceAuditLog[];
  notifications: AppNotification[];
}> {
  try {
    // Check if Firestore has users or courses
    const usersSnap = await getDocs(collection(db, 'users'));
    if (usersSnap.empty) {
      console.log('Firestore is empty. Seeding initial institutional dataset...');
      // Seed Firestore in batches
      const batch = writeBatch(db);

      INITIAL_DEPARTMENTS.forEach((dept) => {
        batch.set(doc(db, 'departments', dept.id), dept);
      });
      INITIAL_SEMESTERS.forEach((sem) => {
        batch.set(doc(db, 'semesters', sem.id), sem);
      });
      INITIAL_USERS.forEach((usr) => {
        batch.set(doc(db, 'users', usr.id), usr);
      });
      INITIAL_COURSES.forEach((crs) => {
        batch.set(doc(db, 'courses', crs.id), crs);
      });
      INITIAL_SESSIONS.forEach((sess) => {
        batch.set(doc(db, 'attendance_sessions', sess.id), sess);
      });
      INITIAL_RECORDS.forEach((rec) => {
        batch.set(doc(db, 'attendance_records', rec.id), rec);
      });
      INITIAL_AUDIT_LOGS.forEach((aud) => {
        batch.set(doc(db, 'attendance_audits', aud.id), aud);
      });
      INITIAL_NOTIFICATIONS.forEach((notif) => {
        batch.set(doc(db, 'notifications', notif.id), notif);
      });

      await batch.commit();
      console.log('Firestore seeded successfully.');

      setLocal('departments', INITIAL_DEPARTMENTS);
      setLocal('semesters', INITIAL_SEMESTERS);
      setLocal('users', INITIAL_USERS);
      setLocal('courses', INITIAL_COURSES);
      setLocal('sessions', INITIAL_SESSIONS);
      setLocal('records', INITIAL_RECORDS);
      setLocal('auditLogs', INITIAL_AUDIT_LOGS);
      setLocal('notifications', INITIAL_NOTIFICATIONS);

      return {
        departments: INITIAL_DEPARTMENTS,
        semesters: INITIAL_SEMESTERS,
        users: INITIAL_USERS,
        courses: INITIAL_COURSES,
        sessions: INITIAL_SESSIONS,
        records: INITIAL_RECORDS,
        auditLogs: INITIAL_AUDIT_LOGS,
        notifications: INITIAL_NOTIFICATIONS,
      };
    } else {
      // Fetch collections from Firestore
      const [
        deptSnap,
        semSnap,
        crsSnap,
        sessSnap,
        recSnap,
        audSnap,
        notifSnap,
      ] = await Promise.all([
        getDocs(collection(db, 'departments')),
        getDocs(collection(db, 'semesters')),
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'attendance_sessions')),
        getDocs(collection(db, 'attendance_records')),
        getDocs(collection(db, 'attendance_audits')),
        getDocs(collection(db, 'notifications')),
      ]);

      const departments = deptSnap.docs.map((d) => d.data() as Department);
      const semesters = semSnap.docs.map((d) => d.data() as AcademicSemester);
      const users = usersSnap.docs.map((d) => d.data() as User);
      const courses = crsSnap.docs.map((d) => d.data() as Course);
      const sessions = sessSnap.docs.map((d) => d.data() as AttendanceSession);
      const records = recSnap.docs.map((d) => d.data() as AttendanceRecord);
      const auditLogs = audSnap.docs.map((d) => d.data() as AttendanceAuditLog);
      const notifications = notifSnap.docs.map((d) => d.data() as AppNotification);

      setLocal('departments', departments);
      setLocal('semesters', semesters);
      setLocal('users', users);
      setLocal('courses', courses);
      setLocal('sessions', sessions);
      setLocal('records', records);
      setLocal('auditLogs', auditLogs);
      setLocal('notifications', notifications);

      return {
        departments,
        semesters,
        users,
        courses,
        sessions,
        records,
        auditLogs,
        notifications,
      };
    }
  } catch (err) {
    console.warn('Firestore fetch failed, falling back to local storage cache:', err);
    return {
      departments: getLocal('departments', INITIAL_DEPARTMENTS),
      semesters: getLocal('semesters', INITIAL_SEMESTERS),
      users: getLocal('users', INITIAL_USERS),
      courses: getLocal('courses', INITIAL_COURSES),
      sessions: getLocal('sessions', INITIAL_SESSIONS),
      records: getLocal('records', INITIAL_RECORDS),
      auditLogs: getLocal('auditLogs', INITIAL_AUDIT_LOGS),
      notifications: getLocal('notifications', INITIAL_NOTIFICATIONS),
    };
  }
}

/**
 * Real-time listener for Attendance Sessions
 */
export function subscribeToSessions(
  callback: (sessions: AttendanceSession[]) => void
): () => void {
  try {
    const unsub = onSnapshot(
      collection(db, 'attendance_sessions'),
      (snapshot) => {
        const sessions = snapshot.docs.map((doc) => doc.data() as AttendanceSession);
        // Sort newest first
        sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLocal('sessions', sessions);
        callback(sessions);
      },
      (error) => {
        console.warn('Snapshot listener error for sessions:', error);
      }
    );
    return unsub;
  } catch (err) {
    console.warn('Could not establish real-time session subscription:', err);
    return () => {};
  }
}

/**
 * Real-time listener for Attendance Records
 */
export function subscribeToRecords(
  callback: (records: AttendanceRecord[]) => void
): () => void {
  try {
    const unsub = onSnapshot(
      collection(db, 'attendance_records'),
      (snapshot) => {
        const records = snapshot.docs.map((doc) => doc.data() as AttendanceRecord);
        setLocal('records', records);
        callback(records);
      },
      (error) => {
        console.warn('Snapshot listener error for records:', error);
      }
    );
    return unsub;
  } catch (err) {
    console.warn('Could not establish real-time records subscription:', err);
    return () => {};
  }
}

/**
 * Create or save an Attendance Session
 */
export async function saveSession(session: AttendanceSession): Promise<void> {
  try {
    await setDoc(doc(db, 'attendance_sessions', session.id), session);
  } catch (err) {
    console.error('Failed to save session to Firestore, saving locally:', err);
  }
  const sessions = getLocal<AttendanceSession[]>('sessions', INITIAL_SESSIONS);
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }
  setLocal('sessions', sessions);
}

/**
 * Save an Attendance Record
 */
export async function saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
  try {
    await setDoc(doc(db, 'attendance_records', record.id), record);
  } catch (err) {
    console.error('Failed to save record to Firestore, saving locally:', err);
  }
  const records = getLocal<AttendanceRecord[]>('records', INITIAL_RECORDS);
  const idx = records.findIndex((r) => r.id === record.id);
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.push(record);
  }
  setLocal('records', records);
}

/**
 * Save an Audit Log
 */
export async function saveAuditLog(log: AttendanceAuditLog): Promise<void> {
  try {
    await setDoc(doc(db, 'attendance_audits', log.id), log);
  } catch (err) {
    console.error('Failed to save audit log to Firestore:', err);
  }
  const logs = getLocal<AttendanceAuditLog[]>('auditLogs', INITIAL_AUDIT_LOGS);
  logs.unshift(log);
  setLocal('auditLogs', logs);
}

/**
 * Save or update a course
 */
export async function saveCourse(course: Course): Promise<void> {
  try {
    await setDoc(doc(db, 'courses', course.id), course);
  } catch (err) {
    console.error('Failed to save course to Firestore:', err);
  }
  const courses = getLocal<Course[]>('courses', INITIAL_COURSES);
  const idx = courses.findIndex((c) => c.id === course.id);
  if (idx >= 0) {
    courses[idx] = course;
  } else {
    courses.push(course);
  }
  setLocal('courses', courses);
}

/**
 * Save or update a user
 */
export async function saveUser(user: User): Promise<void> {
  try {
    await setDoc(doc(db, 'users', user.id), user);
  } catch (err) {
    console.error('Failed to save user to Firestore:', err);
  }
  const users = getLocal<User[]>('users', INITIAL_USERS);
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  setLocal('users', users);
}

/**
 * Save or update a department
 */
export async function saveDepartment(dept: Department): Promise<void> {
  try {
    await setDoc(doc(db, 'departments', dept.id), dept);
  } catch (err) {
    console.error('Failed to save department to Firestore:', err);
  }
  const departments = getLocal<Department[]>('departments', INITIAL_DEPARTMENTS);
  const idx = departments.findIndex((d) => d.id === dept.id);
  if (idx >= 0) {
    departments[idx] = dept;
  } else {
    departments.push(dept);
  }
  setLocal('departments', departments);
}

/**
 * Offline Sync Queue operations
 */
export function getOfflineQueue(): OfflineAttendanceQueueItem[] {
  return getLocal<OfflineAttendanceQueueItem[]>('offline_queue', []);
}

export function addToOfflineQueue(item: OfflineAttendanceQueueItem): void {
  const queue = getOfflineQueue();
  queue.push(item);
  setLocal('offline_queue', queue);
}

export function clearOfflineQueue(): void {
  setLocal('offline_queue', []);
}
