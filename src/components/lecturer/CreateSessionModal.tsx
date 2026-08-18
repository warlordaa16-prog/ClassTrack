import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import {
  X,
  PlusCircle,
  Calendar,
  Clock,
  MapPin,
  QrCode,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { CAMPUS_PRESETS } from '../../lib/geolocation';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: (sessionId: string) => void;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  onSessionCreated,
}) => {
  const { currentUser } = useAuth();
  const { courses, semesters, createSession } = useAttendance();

  // Filter courses for coordinator or admin
  const availableCourses =
    currentUser?.role === 'ADMIN' || currentUser?.role === 'COORDINATOR'
      ? courses
      : courses.filter((c) => c.coordinatorId === currentUser?.id || c.lecturerId === currentUser?.id || courses[0]);

  const [selectedCourseId, setSelectedCourseId] = useState(
    availableCourses[0]?.id || ''
  );
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [lateThresholdMinutes, setLateThresholdMinutes] = useState(15);
  const [requireGeolocation, setRequireGeolocation] = useState(true);
  const [selectedLocationPreset, setSelectedLocationPreset] = useState(0);
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;

    setIsSubmitting(true);
    try {
      const course = courses.find((c) => c.id === selectedCourseId);
      if (!course) return;

      const activeSemester = semesters.find((s) => s.isActive) || semesters[0];
      const location = CAMPUS_PRESETS[selectedLocationPreset];

      const newSession = await createSession({
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        coordinatorId: currentUser.id,
        coordinatorName: currentUser.name,
        lecturerId: currentUser.id,
        lecturerName: currentUser.name,
        semesterId: activeSemester?.id || 'sem-fall-2026',
        date,
        startTime,
        endTime,
        isOpen: true,
        lateThresholdMinutes,
        requireGeolocation,
        coordinates: {
          latitude: location.latitude,
          longitude: location.longitude,
          radiusMeters: location.radiusMeters,
        },
        refreshIntervalSeconds,
        totalEnrolled: course.enrolledStudentIds.length,
      });

      onSessionCreated(newSession.id);
      onClose();
    } catch (err) {
      console.error('Failed to launch attendance session:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#18181b] rounded-3xl shadow-2xl max-w-xl w-full border border-[#27272a] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#09090b] text-[#fafafa] flex items-center justify-between border-b border-[#27272a]">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base text-white">Create Attendance Session</h3>
              <p className="text-xs text-zinc-400">Launch dynamic QR check-in for lecture</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Course Selector */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
              Select Course
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-[#27272a]/60 border border-zinc-700 text-[#fafafa] rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {availableCourses.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#18181b] text-white">
                  {c.code} - {c.name} ({c.enrolledStudentIds.length} Enrolled)
                </option>
              ))}
            </select>
          </div>

          {/* Date & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#27272a]/60 border border-zinc-700 text-[#fafafa] rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Start Time
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#27272a]/60 border border-zinc-700 text-[#fafafa] rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                End Time
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#27272a]/60 border border-zinc-700 text-[#fafafa] rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Late threshold & dynamic token refresh */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Late Grace Period Threshold
              </label>
              <select
                value={lateThresholdMinutes}
                onChange={(e) => setLateThresholdMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 border border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-[#27272a]/60 text-[#fafafa]"
              >
                <option value={5} className="bg-[#18181b] text-white">5 Minutes (Strict)</option>
                <option value={10} className="bg-[#18181b] text-white">10 Minutes</option>
                <option value={15} className="bg-[#18181b] text-white">15 Minutes (Standard)</option>
                <option value={20} className="bg-[#18181b] text-white">20 Minutes</option>
                <option value={30} className="bg-[#18181b] text-white">30 Minutes</option>
              </select>
              <p className="text-[11px] text-zinc-400 mt-1">
                Scans after this duration are marked as LATE.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Dynamic QR Token Rotation
              </label>
              <select
                value={refreshIntervalSeconds}
                onChange={(e) => setRefreshIntervalSeconds(Number(e.target.value))}
                className="w-full px-3 py-2 border border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-[#27272a]/60 text-[#fafafa]"
              >
                <option value={10} className="bg-[#18181b] text-white">Every 10 seconds (High Security)</option>
                <option value={20} className="bg-[#18181b] text-white">Every 20 seconds (Recommended)</option>
                <option value={30} className="bg-[#18181b] text-white">Every 30 seconds</option>
                <option value={60} className="bg-[#18181b] text-white">Every 60 seconds</option>
              </select>
              <p className="text-[11px] text-zinc-400 mt-1">
                Prevents students from messaging screenshots.
              </p>
            </div>
          </div>

          {/* Geolocation Section */}
          <div className="p-4 rounded-2xl bg-[#27272a]/40 border border-[#27272a] space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#fafafa]">
                <input
                  type="checkbox"
                  checked={requireGeolocation}
                  onChange={(e) => setRequireGeolocation(e.target.checked)}
                  className="w-4 h-4 text-emerald-500 rounded border-zinc-700 focus:ring-emerald-500"
                />
                <span>Enable Classroom Geolocation Radius Validation</span>
              </label>
              <MapPin className="w-4 h-4 text-emerald-400" />
            </div>

            {requireGeolocation && (
              <div>
                <label className="block text-[11px] text-zinc-400 font-medium mb-1">
                  Designated Lecture Hall Location & Radius:
                </label>
                <select
                  value={selectedLocationPreset}
                  onChange={(e) => setSelectedLocationPreset(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-[#18181b] text-[#fafafa]"
                >
                  {CAMPUS_PRESETS.map((loc, idx) => (
                    <option key={idx} value={idx} className="bg-[#18181b] text-white">
                      {loc.name} (Radius: {loc.radiusMeters}m)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-zinc-700 text-zinc-300 font-bold rounded-xl text-xs hover:bg-[#27272a] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Launch Live Session Now</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
