import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import {
  QrCode,
  Users,
  PlusCircle,
  Clock,
  Calendar,
  Play,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  BookOpen,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { CreateSessionModal } from './CreateSessionModal';

interface LecturerDashboardProps {
  onOpenLiveSession: (sessionId: string) => void;
  onNavigateToReports?: () => void;
}

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({
  onOpenLiveSession,
  onNavigateToReports,
}) => {
  const { currentUser } = useAuth();
  const { courses, sessions, records } = useAttendance();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  if (!currentUser) return null;

  // Filter courses assigned to lecturer
  const myCourses =
    currentUser.role === 'ADMIN'
      ? courses
      : courses.filter((c) => c.lecturerId === currentUser.id || c.lecturerName.includes(currentUser.name.split(' ')[0]));

  // Active open sessions
  const activeSessions = sessions.filter(
    (s) => s.isOpen && (currentUser.role === 'ADMIN' || s.lecturerId === currentUser.id || s.lecturerName === currentUser.name)
  );

  // Past completed sessions
  const pastSessions = sessions.filter(
    (s) => !s.isOpen && (currentUser.role === 'ADMIN' || s.lecturerId === currentUser.id || s.lecturerName === currentUser.name)
  );

  // Overall attendance stats
  const totalMyRecords = records.filter((r) =>
    myCourses.some((c) => c.id === r.courseId)
  );
  const totalPresent = totalMyRecords.filter((r) => r.status === 'PRESENT').length;
  const totalLate = totalMyRecords.filter((r) => r.status === 'LATE').length;
  const totalAbsent = totalMyRecords.filter((r) => r.status === 'ABSENT').length;
  const totalSessionsCount = sessions.filter((s) =>
    myCourses.some((c) => c.id === s.courseId)
  ).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Welcome & Quick Action Banner */}
      <div className="bg-[#18181b] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#27272a] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Course Conductor Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#fafafa]">
            Welcome, {currentUser.name}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Staff ID: <span className="font-mono text-emerald-400 font-bold">{currentUser.staffId || 'ST-401'}</span> •{' '}
            {myCourses.length} Assigned Academic Courses
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 relative z-10">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
          >
            <PlusCircle className="w-5 h-5 text-black" />
            <span>Create New Attendance Session</span>
          </button>
        </div>
      </div>

      {/* Active Live Sessions (High Priority Section) */}
      {activeSessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h3 className="font-black text-lg text-[#fafafa]">
              Active Live Attendance Sessions ({activeSessions.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSessions.map((sess) => {
              const course = courses.find((c) => c.id === sess.courseId);
              const sessRecs = records.filter((r) => r.sessionId === sess.id);
              const attendedCount = sessRecs.filter(
                (r) => r.status === 'PRESENT' || r.status === 'LATE'
              ).length;
              const totalEnrolled = course?.enrolledStudentIds.length || sess.totalEnrolled || 1;
              const pct = Math.round((attendedCount / totalEnrolled) * 100);

              return (
                <div
                  key={sess.id}
                  className="bg-[#18181b] rounded-3xl p-6 border-2 border-emerald-500/70 shadow-md flex flex-col justify-between space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-[#27272a] text-emerald-400 border border-zinc-700 px-2 py-0.5 rounded">
                          {sess.courseCode}
                        </span>
                        <span className="bg-emerald-500 text-black font-black text-[10px] uppercase px-2 py-0.5 rounded-full">
                          LIVE & ACCEPTING SCANS
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-[#fafafa] mt-1">{sess.courseName}</h4>
                      <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          {sess.startTime} - {sess.endTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                          {course?.room || 'Classroom'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black text-emerald-400">{pct}%</div>
                      <span className="text-[11px] text-zinc-400">
                        {attendedCount}/{totalEnrolled} Scanned
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <button
                    onClick={() => onOpenLiveSession(sess.id)}
                    className="w-full py-2.5 bg-[#27272a] hover:bg-zinc-700 text-[#fafafa] font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>Open Fullscreen Projector & Live Feed</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#18181b] p-5 rounded-3xl border border-[#27272a] shadow-xs">
          <div className="text-xs font-semibold text-zinc-400">Conducted Sessions</div>
          <div className="text-2xl font-black text-[#fafafa] mt-1">{totalSessionsCount}</div>
          <span className="text-[11px] text-zinc-500">This semester</span>
        </div>

        <div className="bg-[#18181b] p-5 rounded-3xl border border-[#27272a] shadow-xs">
          <div className="text-xs font-semibold text-zinc-400">Total Check-Ins</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{totalPresent}</div>
          <span className="text-[11px] text-emerald-400 font-medium">On-time attendances</span>
        </div>

        <div className="bg-[#18181b] p-5 rounded-3xl border border-[#27272a] shadow-xs">
          <div className="text-xs font-semibold text-zinc-400">Late Arrivals</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{totalLate}</div>
          <span className="text-[11px] text-amber-400 font-medium">Recorded with time lag</span>
        </div>

        <div className="bg-[#18181b] p-5 rounded-3xl border border-[#27272a] shadow-xs">
          <div className="text-xs font-semibold text-zinc-400">Absent Records</div>
          <div className="text-2xl font-black text-rose-400 mt-1">{totalAbsent}</div>
          <span className="text-[11px] text-rose-400 font-medium">Unexcused misses</span>
        </div>
      </div>

      {/* Assigned Courses Section */}
      <div className="bg-[#18181b] rounded-3xl p-6 border border-[#27272a] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-[#fafafa] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              Assigned Courses & Roster
            </h3>
            <p className="text-xs text-zinc-400">
              Manage course schedules and launch targeted attendance sessions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myCourses.map((c) => {
            const courseSessions = sessions.filter((s) => s.courseId === c.id);
            const activeSessionForCourse = courseSessions.find((s) => s.isOpen);

            return (
              <div
                key={c.id}
                className="p-5 rounded-2xl border border-[#27272a] bg-[#18181b] hover:border-zinc-700 transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-[#27272a] px-2 py-0.5 rounded border border-zinc-700">
                      {c.code}
                    </span>
                    <span className="text-xs font-semibold text-zinc-300 bg-[#27272a] px-2 py-0.5 rounded-full">
                      {c.enrolledStudentIds.length} Students Enrolled
                    </span>
                  </div>
                  <h4 className="font-bold text-base text-[#fafafa] mt-2">{c.name}</h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      {c.schedule}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      {c.room}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#27272a] flex items-center justify-between gap-3">
                  <span className="text-xs text-zinc-400">
                    {courseSessions.length} total sessions held
                  </span>

                  {activeSessionForCourse ? (
                    <button
                      onClick={() => onOpenLiveSession(activeSessionForCourse.id)}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Live View
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="px-3.5 py-1.5 bg-[#27272a] hover:bg-zinc-700 text-[#fafafa] font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Start Session
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Past Sessions History */}
      <div className="bg-[#18181b] rounded-3xl p-6 border border-[#27272a] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-[#fafafa] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            Recent Session History
          </h3>
          {onNavigateToReports && (
            <button
              onClick={onNavigateToReports}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              Export Attendance Reports <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="divide-y divide-[#27272a]">
          {pastSessions.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">No completed sessions yet.</p>
          ) : (
            pastSessions.map((sess) => {
              const sessRecs = records.filter((r) => r.sessionId === sess.id);
              const pCount = sessRecs.filter((r) => r.status === 'PRESENT').length;
              const lCount = sessRecs.filter((r) => r.status === 'LATE').length;
              const aCount = sessRecs.filter((r) => r.status === 'ABSENT').length;

              return (
                <div
                  key={sess.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400">{sess.courseCode}</span>
                      <span className="font-bold text-[#fafafa]">{sess.courseName}</span>
                    </div>
                    <div className="text-zinc-400 mt-1">
                      {new Date(sess.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      • {sess.startTime} - {sess.endTime}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="text-emerald-400">{pCount} Present</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-amber-400">{lCount} Late</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-rose-400">{aCount} Absent</span>
                    </div>

                    <button
                      onClick={() => onOpenLiveSession(sess.id)}
                      className="px-3 py-1.5 bg-[#27272a] hover:bg-zinc-700 text-[#fafafa] font-bold rounded-lg transition cursor-pointer"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSessionCreated={(newId) => onOpenLiveSession(newId)}
      />
    </div>
  );
};
