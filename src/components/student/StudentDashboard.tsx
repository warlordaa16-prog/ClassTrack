import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import {
  QrCode,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  BookOpen,
  Calendar,
  ChevronRight,
  TrendingUp,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { CourseAttendanceSummary } from '../../types';

interface StudentDashboardProps {
  onOpenScanModal: () => void;
  onNavigateToTab: (tab: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onOpenScanModal,
  onNavigateToTab,
}) => {
  const { currentUser } = useAuth();
  const { courses, sessions, records } = useAttendance();

  if (!currentUser) return null;

  // Filter courses enrolled by this student
  const studentCourses = courses.filter((c) =>
    c.enrolledStudentIds.includes(currentUser.id)
  );

  // Student records
  const studentRecords = records.filter((r) => r.studentId === currentUser.id);

  // Calculate course summaries
  const courseSummaries: CourseAttendanceSummary[] = studentCourses.map((course) => {
    // Find all sessions for this course
    const courseSessions = sessions.filter((s) => s.courseId === course.id);
    const totalSessions = courseSessions.length || 1;

    const courseRecs = studentRecords.filter((r) => r.courseId === course.id);
    const presentSessions = courseRecs.filter((r) => r.status === 'PRESENT').length;
    const lateSessions = courseRecs.filter((r) => r.status === 'LATE').length;
    const absentSessions = courseRecs.filter((r) => r.status === 'ABSENT').length;
    const excusedSessions = courseRecs.filter((r) => r.status === 'EXCUSED').length;

    const attendedSessions = presentSessions + lateSessions;
    const percentage = Math.round((attendedSessions / totalSessions) * 100);

    return {
      courseId: course.id,
      courseCode: course.code,
      courseName: course.name,
      lecturerName: course.lecturerName,
      totalSessions,
      attendedSessions,
      presentSessions,
      lateSessions,
      absentSessions,
      excusedSessions,
      percentage: Math.min(100, Math.max(0, percentage)),
    };
  });

  // Overall Attendance Percentage
  const totalAttended = courseSummaries.reduce((acc, c) => acc + c.attendedSessions, 0);
  const totalPossible = courseSummaries.reduce((acc, c) => acc + c.totalSessions, 0) || 1;
  const overallPercentage = Math.round((totalAttended / totalPossible) * 100);

  const totalPresentCount = studentRecords.filter((r) => r.status === 'PRESENT').length;
  const totalLateCount = studentRecords.filter((r) => r.status === 'LATE').length;
  const totalAbsentCount = studentRecords.filter((r) => r.status === 'ABSENT').length;
  const totalExcusedCount = studentRecords.filter((r) => r.status === 'EXCUSED').length;

  // Active open sessions right now for enrolled courses
  const liveSessions = sessions.filter(
    (s) => s.isOpen && studentCourses.some((c) => c.id === s.courseId)
  );

  // Today's classes
  const todayDate = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter(
    (s) => s.date === todayDate && studentCourses.some((c) => c.id === s.courseId)
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Student Welcome & Hero Card */}
      <div className="bg-[#18181b] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-[#27272a]">
        {/* Background visual elements */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fall Semester 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#fafafa]">
              Good Day, {currentUser.name.split(' ')[0]}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Student ID:{' '}
              <span className="font-mono text-emerald-400 font-bold">
                {currentUser.studentNumber}
              </span>{' '}
              • {studentCourses.length} Registered Courses
            </p>
          </div>

          {/* Overall Attendance Stat Gauge */}
          <div className="bg-[#27272a]/70 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-zinc-700/60 flex items-center gap-5 shadow-lg">
            <div className="relative flex items-center justify-center">
              {/* Circular percentage */}
              <div className="w-18 h-18 rounded-full border-4 border-zinc-700 flex items-center justify-center bg-[#18181b]">
                <span
                  className={`text-xl font-black ${
                    overallPercentage >= 85
                      ? 'text-emerald-400'
                      : overallPercentage >= 75
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {overallPercentage}%
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 font-medium">Overall Attendance</div>
              <div className="text-sm font-bold text-[#fafafa] mt-0.5">
                {overallPercentage >= 85
                  ? 'Excellent Standing'
                  : overallPercentage >= 75
                  ? 'Satisfactory'
                  : 'Action Required (<75%)'}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">
                {totalPresentCount} Present • {totalLateCount} Late • {totalAbsentCount} Absent
              </div>
            </div>
          </div>
        </div>

        {/* Hero Scan Call To Action */}
        <div className="mt-6 pt-6 border-t border-[#27272a] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-zinc-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>
              {liveSessions.length > 0
                ? `${liveSessions.length} live attendance session active right now!`
                : 'Ready for classroom QR check-ins'}
            </span>
          </div>
          <button
            onClick={onOpenScanModal}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition transform active:scale-98 cursor-pointer"
          >
            <QrCode className="w-5 h-5 text-black" />
            <span>Scan Attendance QR</span>
          </button>
        </div>
      </div>

      {/* Live Class Alert Box (if active session) */}
      {liveSessions.length > 0 && (
        <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center shrink-0">
                <QrCode className="w-6 h-6 animate-pulse text-black" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                    LIVE SESSION OPEN
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold font-mono">
                    {liveSessions[0].courseCode}
                  </span>
                </div>
                <h4 className="font-bold text-[#fafafa] text-base mt-0.5">
                  {liveSessions[0].courseName}
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Conducted by {liveSessions[0].lecturerName} • Room:{' '}
                  {courses.find((c) => c.id === liveSessions[0].courseId)?.room || 'Lecture Hall'}
                  {liveSessions[0].requireGeolocation && liveSessions[0].coordinates && (
                    <span className="text-emerald-400 font-medium ml-2 inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Geofenced ({liveSessions[0].coordinates.radiusMeters}m radius)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={onOpenScanModal}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-black" />
              Check In Now
            </button>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#18181b] p-4 rounded-2xl border border-[#27272a] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Present</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-[#fafafa] mt-2">{totalPresentCount}</div>
          <span className="text-[10px] text-emerald-400 font-medium">On-time check-ins</span>
        </div>

        <div className="bg-[#18181b] p-4 rounded-2xl border border-[#27272a] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Late</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-[#fafafa] mt-2">{totalLateCount}</div>
          <span className="text-[10px] text-amber-400 font-medium">&gt;15 min arrivals</span>
        </div>

        <div className="bg-[#18181b] p-4 rounded-2xl border border-[#27272a] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Absent</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-[#fafafa] mt-2">{totalAbsentCount}</div>
          <span className="text-[10px] text-rose-400 font-medium">Missed sessions</span>
        </div>

        <div className="bg-[#18181b] p-4 rounded-2xl border border-[#27272a] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Excused</span>
            <AlertTriangle className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-[#fafafa] mt-2">{totalExcusedCount}</div>
          <span className="text-[10px] text-indigo-400 font-medium">Approved notes</span>
        </div>
      </div>

      {/* Registered Courses & Attendance Progress */}
      <div className="bg-[#18181b] rounded-3xl p-6 border border-[#27272a] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-[#fafafa] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              Registered Courses & Attendance
            </h3>
            <p className="text-xs text-zinc-400">
              Minimum 80% attendance required for semester exam qualification
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('courses')}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
          >
            View All Courses <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {courseSummaries.map((summary) => (
            <div
              key={summary.courseId}
              className="p-4 rounded-2xl border border-[#27272a] bg-[#27272a]/40 hover:bg-[#27272a]/70 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#18181b] text-emerald-400 border border-zinc-700 text-[11px] font-mono font-bold rounded">
                      {summary.courseCode}
                    </span>
                    <h4 className="text-sm font-bold text-[#fafafa]">{summary.courseName}</h4>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Lecturer: {summary.lecturerName}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div
                      className={`text-base font-black ${
                        summary.percentage >= 85
                          ? 'text-emerald-400'
                          : summary.percentage >= 75
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {summary.percentage}%
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {summary.attendedSessions}/{summary.totalSessions} Sessions
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-800 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    summary.percentage >= 85
                      ? 'bg-emerald-500'
                      : summary.percentage >= 75
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${summary.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Timetable */}
      <div className="bg-[#18181b] rounded-3xl p-6 border border-[#27272a] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-[#fafafa] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            Today's Scheduled Classes
          </h3>
          <span className="text-xs font-medium text-zinc-400 font-mono">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {studentCourses.map((course) => (
            <div
              key={course.id}
              className="p-4 rounded-2xl border border-[#27272a] bg-[#18181b] hover:border-zinc-600 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {course.code}
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-300 bg-[#27272a] px-2 py-0.5 rounded-full">
                    {course.credits} Credits
                  </span>
                </div>
                <h4 className="font-bold text-sm text-[#fafafa] mt-1">{course.name}</h4>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-2">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{course.schedule}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{course.room}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
