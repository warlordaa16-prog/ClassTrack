import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import {
  BookOpen,
  User,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const StudentCoursesView: React.FC = () => {
  const { currentUser } = useAuth();
  const { courses, sessions, records } = useAttendance();
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  if (!currentUser) return null;

  const enrolledCourses = courses.filter((c) =>
    c.enrolledStudentIds.includes(currentUser.id)
  );

  const toggleCourse = (id: string) => {
    setExpandedCourseId(expandedCourseId === id ? null : id);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-black text-[#fafafa] flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-400" />
            My Registered Courses
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Enrolled academic units, schedules, and attendance compliance
          </p>
        </div>
        <div className="text-xs font-semibold text-zinc-300 bg-[#18181b] border border-[#27272a] px-3 py-1.5 rounded-xl self-start sm:self-auto">
          {enrolledCourses.length} Active Courses
        </div>
      </div>

      <div className="space-y-4">
        {enrolledCourses.map((course) => {
          const courseSessions = sessions.filter((s) => s.courseId === course.id);
          const courseRecords = records.filter(
            (r) => r.courseId === course.id && r.studentId === currentUser.id
          );

          const presentCount = courseRecords.filter((r) => r.status === 'PRESENT').length;
          const lateCount = courseRecords.filter((r) => r.status === 'LATE').length;
          const absentCount = courseRecords.filter((r) => r.status === 'ABSENT').length;
          const excusedCount = courseRecords.filter((r) => r.status === 'EXCUSED').length;

          const totalHeld = courseSessions.length || 1;
          const percentage = Math.round(((presentCount + lateCount) / totalHeld) * 100);
          const isExpanded = expandedCourseId === course.id;

          return (
            <div
              key={course.id}
              className="bg-[#18181b] rounded-3xl border border-[#27272a] overflow-hidden shadow-xs hover:border-zinc-700 transition"
            >
              {/* Main Card Row */}
              <div
                onClick={() => toggleCourse(course.id)}
                className="p-5 sm:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-950/40 text-emerald-400 font-mono font-bold flex items-center justify-center text-sm border border-emerald-500/30 shrink-0">
                    {course.code.split('-')[1] || course.code}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-[#27272a] px-2 py-0.5 rounded border border-zinc-700">
                        {course.code}
                      </span>
                      <span className="text-xs text-zinc-400 font-medium">
                        {course.credits} Credits
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#fafafa] mt-1">{course.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 mt-1.5">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-zinc-500" />
                        {course.lecturerName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        {course.schedule}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        {course.room}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-[#27272a]">
                  <div className="text-right">
                    <div
                      className={`text-xl font-black ${
                        percentage >= 85
                          ? 'text-emerald-400'
                          : percentage >= 75
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {percentage}%
                    </div>
                    <div className="text-[11px] text-zinc-400 font-medium">
                      {presentCount + lateCount} / {totalHeld} Sessions Attended
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center text-zinc-300">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Collapsible Session Records Details */}
              {isExpanded && (
                <div className="px-6 pb-6 pt-2 bg-[#27272a]/30 border-t border-[#27272a] space-y-4 animate-fade-in">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-[#18181b] p-3 rounded-xl border border-[#27272a]">
                      <span className="text-[11px] text-zinc-400">Present</span>
                      <div className="text-lg font-bold text-emerald-400">{presentCount}</div>
                    </div>
                    <div className="bg-[#18181b] p-3 rounded-xl border border-[#27272a]">
                      <span className="text-[11px] text-zinc-400">Late</span>
                      <div className="text-lg font-bold text-amber-400">{lateCount}</div>
                    </div>
                    <div className="bg-[#18181b] p-3 rounded-xl border border-[#27272a]">
                      <span className="text-[11px] text-zinc-400">Absent</span>
                      <div className="text-lg font-bold text-rose-400">{absentCount}</div>
                    </div>
                    <div className="bg-[#18181b] p-3 rounded-xl border border-[#27272a]">
                      <span className="text-[11px] text-zinc-400">Excused</span>
                      <div className="text-lg font-bold text-indigo-400">{excusedCount}</div>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Session Log for {course.code}
                  </h4>

                  {courseSessions.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">No attendance sessions held yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {courseSessions.map((sess) => {
                        const rec = courseRecords.find((r) => r.sessionId === sess.id);
                        return (
                          <div
                            key={sess.id}
                            className="bg-[#18181b] p-3 rounded-xl border border-[#27272a] flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <Calendar className="w-4 h-4 text-zinc-500" />
                              <div>
                                <div className="font-bold text-[#fafafa]">
                                  {new Date(sess.date).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </div>
                                <div className="text-[11px] text-zinc-400">
                                  {sess.startTime} - {sess.endTime} • {sess.isOpen ? 'OPEN' : 'COMPLETED'}
                                </div>
                              </div>
                            </div>

                            <div>
                              {rec ? (
                                <span
                                  className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                                    rec.status === 'PRESENT'
                                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                                      : rec.status === 'LATE'
                                      ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                                      : rec.status === 'ABSENT'
                                      ? 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                                      : 'bg-indigo-950/60 text-indigo-400 border border-indigo-500/30'
                                  }`}
                                >
                                  {rec.status}
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-[#27272a] text-zinc-400 rounded-full font-medium text-[10px]">
                                  {sess.isOpen ? 'PENDING SCAN' : 'NOT MARKED'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
