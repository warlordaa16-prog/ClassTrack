import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import {
  History,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  MapPin,
  Calendar,
} from 'lucide-react';
import { AttendanceStatus } from '../../types';

export const StudentHistoryView: React.FC = () => {
  const { currentUser } = useAuth();
  const { records, courses, sessions } = useAttendance();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'ALL'>('ALL');

  if (!currentUser) return null;

  const studentRecords = records
    .filter((r) => r.studentId === currentUser.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredRecords = studentRecords.filter((rec) => {
    const course = courses.find((c) => c.id === rec.courseId);
    const matchesSearch =
      rec.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course && course.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' ? true : rec.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Present
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/60 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> Late
          </span>
        );
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-950/60 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> Absent
          </span>
        );
      case 'EXCUSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-950/60 text-indigo-400 border border-indigo-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Excused
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#fafafa] flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-400" />
            Attendance History Log
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Chronological audit of all your classroom check-ins, timestamps, and locations
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#18181b] p-4 rounded-2xl border border-[#27272a] shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by course code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#27272a]/60 border border-zinc-700 text-[#fafafa] placeholder-zinc-500 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {(['ALL', 'PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-emerald-500 text-black'
                  : 'bg-[#27272a] text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* History Table / Cards */}
      <div className="bg-[#18181b] rounded-3xl border border-[#27272a] shadow-sm overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <History className="w-10 h-10 mx-auto mb-2 stroke-1 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-400">No matching attendance records found.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#27272a]">
            {filteredRecords.map((rec) => {
              const session = sessions.find((s) => s.id === rec.sessionId);
              const course = courses.find((c) => c.id === rec.courseId);

              return (
                <div
                  key={rec.id}
                  className="p-4 sm:p-5 hover:bg-[#27272a]/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#27272a] text-emerald-400 border border-zinc-700 font-mono font-bold flex items-center justify-center text-xs shrink-0">
                      {rec.courseCode.split('-')[1] || rec.courseCode}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#fafafa]">
                          {rec.courseCode}
                        </span>
                        <span className="text-xs text-zinc-400 font-medium">
                          {course?.name || 'Class Session'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          {new Date(rec.checkInTime || rec.createdAt).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        {rec.checkInTime && (
                          <span className="flex items-center gap-1 font-mono text-zinc-300">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            {new Date(rec.checkInTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                        {rec.location?.isValid && (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <MapPin className="w-3.5 h-3.5" />
                            Verified GPS
                            {rec.location.distanceMeters !== undefined &&
                              ` (${rec.location.distanceMeters}m)`}
                          </span>
                        )}
                      </div>

                      {rec.notes && (
                        <p className="text-[11px] text-zinc-400 italic mt-1 bg-[#27272a]/60 px-2 py-0.5 rounded border border-zinc-700/60 inline-block">
                          Note: {rec.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                    {rec.minutesLate && rec.minutesLate > 0 ? (
                      <span className="text-[11px] text-amber-400 font-medium bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        +{rec.minutesLate}m late
                      </span>
                    ) : null}
                    {getStatusBadge(rec.status)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
