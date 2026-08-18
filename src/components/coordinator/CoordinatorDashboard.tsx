import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import {
  BarChart3,
  Users,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  Building,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldCheck,
  Send,
  PlusCircle,
  Play,
  QrCode,
  Sparkles,
  Search,
  Check,
  XCircle,
  FileSpreadsheet,
  Edit3,
} from 'lucide-react';
import { Course, Department, User, AttendanceSession, AttendanceStatus } from '../../types';
import { CreateSessionModal } from '../lecturer/CreateSessionModal';
import { ManualAttendanceModal } from '../lecturer/ManualAttendanceModal';

interface CoordinatorDashboardProps {
  onOpenLiveSession?: (sessionId: string) => void;
  onNavigateToReports?: () => void;
}

export const CoordinatorDashboard: React.FC<CoordinatorDashboardProps> = ({
  onOpenLiveSession,
  onNavigateToReports,
}) => {
  const { users, currentUser } = useAuth();
  const {
    courses,
    departments,
    sessions,
    records,
    createNotification,
    reopenSession,
  } = useAttendance();

  const [activeTab, setActiveTab] = useState<'sessions' | 'radar' | 'benchmarks' | 'audit'>('sessions');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [warningSentStudentIds, setWarningSentStudentIds] = useState<Set<string>>(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStudentForAudit, setSelectedStudentForAudit] = useState<{
    sessionId: string;
    student: User;
    courseId: string;
    courseCode: string;
    currentStatus: AttendanceStatus | 'NONE';
    recordId: string | null;
  } | null>(null);

  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  if (!currentUser) return null;

  const allStudents = users.filter((u) => u.role === 'STUDENT');
  const allCoordinators = users.filter((u) => u.role === 'COORDINATOR');

  // Filter courses
  const filteredCourses =
    selectedDeptId === 'ALL'
      ? courses
      : courses.filter((c) => c.departmentId === selectedDeptId);

  // Active open sessions
  const activeSessions = sessions.filter((s) => s.isOpen);
  const pastSessions = sessions.filter((s) => !s.isOpen);

  // Overall attendance calculations
  const totalRecordsCount = records.length || 1;
  const attendedCount = records.filter(
    (r) => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'EXCUSED'
  ).length;
  const systemAverageAttendance = Math.round((attendedCount / totalRecordsCount) * 100);

  // Calculate student risk list (attendance < 75%)
  const lowAttendanceStudents = allStudents
    .map((student) => {
      const studentRecs = records.filter((r) => r.studentId === student.id);
      const studentEnrolledCourses = courses.filter((c) =>
        c.enrolledStudentIds.includes(student.id)
      );

      const totalRequiredSessions =
        studentEnrolledCourses.reduce((acc, c) => {
          const cSessions = sessions.filter((s) => s.courseId === c.id);
          return acc + (cSessions.length || 1);
        }, 0) || 1;

      const attended = studentRecs.filter(
        (r) => r.status === 'PRESENT' || r.status === 'LATE'
      ).length;

      const pct = Math.round((attended / totalRequiredSessions) * 100);

      return {
        student,
        percentage: Math.min(100, pct),
        enrolledCount: studentEnrolledCourses.length,
        attendedCount: attended,
        totalRequired: totalRequiredSessions,
      };
    })
    .filter((s) => s.percentage < 75)
    .sort((a, b) => a.percentage - b.percentage);

  // Course-by-course analytics
  const courseAnalytics = filteredCourses.map((c) => {
    const cSessions = sessions.filter((s) => s.courseId === c.id);
    const cRecords = records.filter((r) => r.courseId === c.id);
    const attended = cRecords.filter(
      (r) => r.status === 'PRESENT' || r.status === 'LATE'
    ).length;
    const totalExpected = c.enrolledStudentIds.length * (cSessions.length || 1) || 1;
    const rate = Math.min(100, Math.round((attended / totalExpected) * 100));

    return {
      course: c,
      sessionCount: cSessions.length,
      attendanceRate: rate,
      enrolledCount: c.enrolledStudentIds.length,
    };
  });

  const handleSendWarning = (student: User, pct: number) => {
    createNotification({
      userId: student.id,
      title: 'Official Low Attendance Warning',
      message: `Your cumulative semester attendance has dropped to ${pct}%. Institutional policy requires at least 80% to be eligible for final examinations. Please contact your Academic Coordinator immediately.`,
      type: 'WARNING',
      link: 'courses',
    });

    setWarningSentStudentIds((prev) => new Set(prev).add(student.id));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-[#18181b] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#27272a] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold border border-purple-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Academic Coordinator Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#fafafa]">
            Welcome, {currentUser.name}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Staff ID: <span className="font-mono text-purple-400 font-bold">{currentUser.staffId || 'ST-101'}</span> •{' '}
            {courses.length} Academic Department Offerings • {activeSessions.length} Active Live Sessions
          </p>
        </div>

        <div className="flex flex-wrap gap-3 relative z-10">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-black" />
            <span>Start Live Session</span>
          </button>
        </div>
      </div>

      {/* Coordinator Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#27272a] pb-3">
        {[
          { id: 'sessions', label: `Live Sessions & Conductor (${sessions.length})`, icon: QrCode },
          { id: 'radar', label: `Low Attendance Risk Radar (${lowAttendanceStudents.length})`, icon: AlertTriangle },
          { id: 'benchmarks', label: `Course Attendance Benchmarks (${filteredCourses.length})`, icon: BarChart3 },
          { id: 'audit', label: 'Manual Status Correction & Audits', icon: Edit3 },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === id
                ? 'bg-gradient-to-r from-purple-500 to-indigo-400 text-black shadow-xs'
                : 'bg-[#18181b] text-zinc-400 hover:bg-[#27272a] hover:text-[#fafafa] border border-[#27272a]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#18181b] p-5 rounded-3xl border border-[#27272a] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Total Enrolled</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-[#fafafa] mt-2">{allStudents.length}</div>
          <span className="text-[11px] text-zinc-500">Students in department</span>
        </div>

        <div className="bg-[#18181b] p-5 rounded-3xl border border-[#27272a] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Active Live Sessions</span>
            <QrCode className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">{activeSessions.length}</div>
          <span className="text-[11px] text-emerald-500/80 font-medium">Accepting live scans</span>
        </div>

        <div className="bg-[#18181b] p-5 rounded-3xl border border-[#27272a] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Avg Attendance</span>
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400 mt-2">{systemAverageAttendance}%</div>
          <span className="text-[11px] text-teal-500/80 font-medium">Semester benchmark</span>
        </div>

        <div className="bg-[#18181b] p-5 rounded-3xl border border-[#27272a] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">At-Risk Students</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2">{lowAttendanceStudents.length}</div>
          <span className="text-[11px] text-rose-400/80 font-medium">&lt;75% Attendance threshold</span>
        </div>
      </div>

      {/* TAB 1: Live Sessions & Conductor */}
      {activeTab === 'sessions' && (
        <div className="space-y-6 animate-fade-in">
          {/* Active Live Sessions Section */}
          {activeSessions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <h3 className="font-black text-lg text-[#fafafa]">
                    Active Live Sessions ({activeSessions.length})
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-[#18181b] rounded-3xl p-6 border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/5 space-y-4 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-black">
                            Accepting Scans
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {session.courseCode}
                          </span>
                        </div>
                        <h4 className="font-bold text-base text-[#fafafa] mt-1">{session.courseName}</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">Coordinator: {session.coordinatorName || session.lecturerName}</p>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-black text-[#fafafa]">
                          {session.presentCount + session.lateCount} / {session.totalEnrolled}
                        </div>
                        <div className="text-[10px] font-semibold text-zinc-400 uppercase">Checked-In</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-zinc-400 border-t border-[#27272a] pt-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{session.startTime} - {session.endTime}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-emerald-400">
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Dynamic QR Active ({session.refreshIntervalSeconds || 20}s)</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenLiveSession && onOpenLiveSession(session.id)}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-black" />
                      <span>Enter Live Conductor / Projector View</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past / Completed Sessions */}
          <div className="bg-[#18181b] rounded-3xl p-6 border border-[#27272a] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#fafafa] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  Conducted Attendance Sessions Log ({pastSessions.length})
                </h3>
                <p className="text-xs text-zinc-400">Review completed records and reopen or audit attendances</p>
              </div>
            </div>

            {pastSessions.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs">
                No past sessions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {pastSessions.map((session) => (
                  <div
                    key={session.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-purple-400">{session.courseCode}</span>
                        <span className="font-bold text-[#fafafa]">{session.courseName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400">
                          Closed
                        </span>
                      </div>
                      <div className="text-zinc-400 mt-1 flex items-center gap-3">
                        <span>Date: {session.date}</span>
                        <span>•</span>
                        <span>{session.startTime} - {session.endTime}</span>
                        <span>•</span>
                        <span>Coordinator: {session.coordinatorName || session.lecturerName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right pr-2">
                        <div className="font-bold text-[#fafafa]">
                          {session.presentCount} Present • {session.lateCount} Late • {session.absentCount} Absent
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {Math.round(((session.presentCount + session.lateCount) / (session.totalEnrolled || 1)) * 100)}% Turnout
                        </div>
                      </div>

                      <button
                        onClick={() => reopenSession(session.id)}
                        className="px-3 py-1.5 border border-zinc-700 hover:bg-[#27272a] text-zinc-300 rounded-xl font-bold transition cursor-pointer"
                      >
                        Reopen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Low Attendance Risk Radar */}
      {activeTab === 'radar' && (
        <div className="bg-[#18181b] rounded-3xl p-6 border border-[#27272a] shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#fafafa]">
                  Low Attendance Risk Radar (&lt;75%)
                </h3>
                <p className="text-xs text-zinc-400">
                  Students below the institutional threshold requiring coordinator intervention
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
              {lowAttendanceStudents.length} Critical Cases
            </span>
          </div>

          {lowAttendanceStudents.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
              <p className="text-sm font-bold text-zinc-300">No At-Risk Students</p>
              <p className="text-xs text-zinc-500">
                All enrolled students maintain attendance above 75%.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {lowAttendanceStudents.map(({ student, percentage, attendedCount, totalRequired }) => {
                const isSent = warningSentStudentIds.has(student.id);

                return (
                  <div
                    key={student.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          student.avatarUrl ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`
                        }
                        alt={student.name}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-rose-500/30"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="font-bold text-[#fafafa] text-sm">{student.name}</div>
                        <div className="text-zinc-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-medium text-emerald-400">{student.studentNumber}</span>
                          <span>•</span>
                          <span>{student.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6">
                      <div className="text-right">
                        <span className="text-base font-black text-rose-400">{percentage}%</span>
                        <div className="text-[11px] text-zinc-500">
                          {attendedCount} / {totalRequired} Sessions
                        </div>
                      </div>

                      <button
                        onClick={() => handleSendWarning(student, percentage)}
                        disabled={isSent}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                          isSent
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            : 'bg-rose-500 hover:bg-rose-600 text-white shadow-xs'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSent ? 'Warning Dispatched' : 'Dispatch Warning'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Course Benchmarks */}
      {activeTab === 'benchmarks' && (
        <div className="bg-[#18181b] rounded-3xl p-6 border border-[#27272a] shadow-sm space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg text-[#fafafa] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                Course Attendance Benchmark Overview
              </h3>
              <p className="text-xs text-zinc-400">Departmental course attendance comparisons and attendance targets</p>
            </div>

            {/* Department Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-zinc-400">Department:</label>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="px-3 py-1.5 bg-[#18181b] border border-zinc-700 text-[#fafafa] rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 outline-none shadow-xs"
              >
                <option value="ALL" className="bg-[#18181b] text-white">All Academic Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id} className="bg-[#18181b] text-white">
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courseAnalytics.map(({ course, sessionCount, attendanceRate, enrolledCount }) => (
              <div
                key={course.id}
                className="p-5 rounded-2xl border border-[#27272a] bg-[#27272a]/30 hover:border-purple-500/50 transition space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                        {course.code}
                      </span>
                      <span className="text-xs text-zinc-400 font-medium">
                        {enrolledCount} Enrolled
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-[#fafafa] mt-1">{course.name}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">Faculty: {course.coordinatorName || course.lecturerName}</p>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-xl font-black ${
                        attendanceRate >= 85
                          ? 'text-emerald-400'
                          : attendanceRate >= 75
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {attendanceRate}%
                    </div>
                    <span className="text-[10px] text-zinc-500">{sessionCount} Sessions Held</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      attendanceRate >= 85
                        ? 'bg-emerald-400'
                        : attendanceRate >= 75
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Manual Status Correction & Audits */}
      {activeTab === 'audit' && (
        <div className="bg-[#18181b] rounded-3xl p-6 border border-[#27272a] shadow-sm space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg text-[#fafafa] flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-400" />
                Manual Attendance Correction & Audit Ledger
              </h3>
              <p className="text-xs text-zinc-400">
                Directly correct student statuses with audited justification logs
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student or course..."
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#27272a]/60 border border-zinc-700 text-[#fafafa] rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-zinc-800">
            {records
              .filter(
                (r) =>
                  !auditSearchQuery ||
                  r.studentName.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
                  r.courseCode.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
                  r.studentNumber.toLowerCase().includes(auditSearchQuery.toLowerCase())
              )
              .slice(0, 15)
              .map((record) => {
                const student = users.find((u) => u.id === record.studentId);

                return (
                  <div
                    key={record.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-[#27272a]/30 px-2 rounded-xl transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#fafafa]">{record.studentName}</span>
                        <span className="font-mono text-emerald-400 font-medium">({record.studentNumber})</span>
                        <span className="font-mono font-bold text-purple-400">{record.courseCode}</span>
                      </div>
                      <div className="text-zinc-400 text-[11px] mt-0.5">
                        Recorded: {record.checkInTime ? new Date(record.checkInTime).toLocaleString() : 'Manual / Closed'} • Method: {record.verificationMethod}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          record.status === 'PRESENT'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : record.status === 'LATE'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : record.status === 'ABSENT'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}
                      >
                        {record.status}
                      </span>

                      {student && (
                        <button
                          onClick={() =>
                            setSelectedStudentForAudit({
                              sessionId: record.sessionId,
                              student,
                              courseId: record.courseId,
                              courseCode: record.courseCode,
                              currentStatus: record.status,
                              recordId: record.id,
                            })
                          }
                          className="px-3 py-1 bg-[#27272a] hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Audit</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Session Create Modal */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSessionCreated={(sId) => {
          setIsCreateModalOpen(false);
          if (onOpenLiveSession) onOpenLiveSession(sId);
        }}
      />

      {/* Manual Attendance Modal */}
      {selectedStudentForAudit && (
        <ManualAttendanceModal
          isOpen={true}
          onClose={() => setSelectedStudentForAudit(null)}
          sessionId={selectedStudentForAudit.sessionId}
          student={selectedStudentForAudit.student}
          courseId={selectedStudentForAudit.courseId}
          courseCode={selectedStudentForAudit.courseCode}
          currentStatus={selectedStudentForAudit.currentStatus}
          recordId={selectedStudentForAudit.recordId}
        />
      )}
    </div>
  );
};
