import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import {
  QrCode,
  Users,
  Clock,
  RefreshCw,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Maximize2,
  Minimize2,
  ShieldCheck,
  MapPin,
  Edit3,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { generateQRCodeDataUrl, formatQRPayload } from '../../lib/qr';
import { AttendanceRecord, AttendanceStatus, User } from '../../types';
import { ManualAttendanceModal } from './ManualAttendanceModal';

interface LiveSessionViewProps {
  sessionId: string;
  onBack: () => void;
}

export const LiveSessionView: React.FC<LiveSessionViewProps> = ({
  sessionId,
  onBack,
}) => {
  const { currentUser } = useAuth();
  const { sessions, records, courses, refreshSessionToken, closeSession, reopenSession } =
    useAttendance();

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<{
    recordId: string | null;
    student: User;
    currentStatus: AttendanceStatus | 'NONE';
  } | null>(null);

  const session = sessions.find((s) => s.id === sessionId);
  const course = courses.find((c) => c.id === session?.courseId);

  // Filter records for this session
  const sessionRecords = records.filter((r) => r.sessionId === sessionId);

  // Generate QR image when token changes
  useEffect(() => {
    if (!session) return;
    const payload = formatQRPayload(session.id, session.currentToken);
    generateQRCodeDataUrl(payload).then(setQrDataUrl);
  }, [session?.currentToken, session?.id]);

  // Dynamic Token Rotation Timer
  useEffect(() => {
    if (!session || !session.isOpen) return;

    const interval = session.refreshIntervalSeconds || 20;
    setSecondsRemaining(interval);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          refreshSessionToken(session.id);
          return interval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session?.id, session?.isOpen, session?.refreshIntervalSeconds, refreshSessionToken]);

  // Fullscreen container ref
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!session) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-sm font-semibold text-zinc-400">Session not found or expired.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-bold transition cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const presentCount = sessionRecords.filter((r) => r.status === 'PRESENT').length;
  const lateCount = sessionRecords.filter((r) => r.status === 'LATE').length;
  const absentCount = sessionRecords.filter((r) => r.status === 'ABSENT').length;
  const excusedCount = sessionRecords.filter((r) => r.status === 'EXCUSED').length;

  const totalEnrolled = course ? course.enrolledStudentIds.length : session.totalEnrolled || 1;
  const totalAttended = presentCount + lateCount;
  const attendancePercentage = Math.min(
    100,
    Math.round((totalAttended / (totalEnrolled || 1)) * 100)
  );

  const handleManualEdit = (record: AttendanceRecord) => {
    const studentObj: User = {
      id: record.studentId,
      name: record.studentName,
      studentNumber: record.studentNumber,
      email: `${record.studentName.toLowerCase().replace(/\s+/g, '.')}@classtrack.edu`,
      role: 'STUDENT',
      createdAt: record.createdAt,
    };
    setSelectedStudentForEdit({
      recordId: record.id,
      student: studentObj,
      currentStatus: record.status,
    });
  };

  return (
    <div
      ref={containerRef}
      className={`space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in ${
        isFullscreen ? 'p-8 bg-[#09090b] text-[#fafafa] min-h-screen' : ''
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] rounded-xl text-zinc-300 transition cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-[#27272a] text-emerald-400 border border-zinc-700 px-2 py-0.5 rounded">
                {session.courseCode}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  session.isOpen
                    ? 'bg-emerald-500 text-black font-extrabold animate-pulse'
                    : 'bg-[#27272a] text-zinc-400'
                }`}
              >
                {session.isOpen ? 'LIVE SESSION OPEN' : 'SESSION CLOSED'}
              </span>
            </div>
            <h2 className="text-2xl font-black text-[#fafafa] mt-0.5">{session.courseName}</h2>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] rounded-xl text-zinc-300 transition cursor-pointer"
            title="Toggle Projector Mode"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {session.isOpen ? (
            <button
              onClick={() => currentUser && closeSession(session.id, currentUser)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Close Attendance</span>
            </button>
          ) : (
            <button
              onClick={() => reopenSession(session.id)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Reopen Attendance</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Live Attendance Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Dynamic QR Projector Canvas */}
        <div className="lg:col-span-5 bg-[#18181b] rounded-3xl p-6 text-[#fafafa] border border-[#27272a] shadow-xl flex flex-col items-center justify-between text-center relative overflow-hidden">
          <div className="w-full flex items-center justify-between text-xs text-zinc-400 pb-3 border-b border-[#27272a]">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              {session.startTime} - {session.endTime}
            </span>
            <span>
              {session.requireGeolocation && session.coordinates ? (
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <MapPin className="w-3 h-3" /> Geofence {session.coordinates.radiusMeters}m
                </span>
              ) : (
                'Standard Mode'
              )}
            </span>
          </div>

          {/* QR Code Container */}
          <div className="my-6 p-4 bg-white rounded-3xl shadow-2xl relative group">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Dynamic Session QR Code"
                className="w-64 h-64 sm:w-72 sm:h-72 object-contain transition-transform group-hover:scale-102"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-zinc-400">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            )}

            {!session.isOpen && (
              <div className="absolute inset-0 bg-black/85 rounded-3xl flex flex-col items-center justify-center text-white p-4">
                <XCircle className="w-12 h-12 text-rose-400 mb-2" />
                <span className="font-bold text-base text-[#fafafa]">Session Closed</span>
                <p className="text-xs text-zinc-300 text-center mt-1">
                  Attendance is locked. Reopen session to accept new scans.
                </p>
              </div>
            )}
          </div>

          {/* Auto-Rotation Progress & Controls */}
          {session.isOpen && (
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Next QR Rotation:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {secondsRemaining}s remaining
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-1000"
                  style={{
                    width: `${((secondsRemaining / (session.refreshIntervalSeconds || 20)) * 100)}%`,
                  }}
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">
                  Rotating Cryptographic Token
                </span>
                <button
                  onClick={() => refreshSessionToken(session.id)}
                  className="px-3 py-1.5 bg-[#27272a] hover:bg-zinc-700 text-emerald-400 border border-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Force Refresh
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Attendance Stats & Real-Time Student Stream */}
        <div className="lg:col-span-7 space-y-4">
          {/* Real-time Summary Card */}
          <div className="bg-[#18181b] rounded-3xl p-6 border border-[#27272a] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Live Attendance Gauge
                </span>
                <h3 className="text-2xl font-black text-[#fafafa] mt-0.5">
                  {totalAttended} / {totalEnrolled} Students
                </h3>
              </div>
              <div className="text-right">
                <div
                  className={`text-3xl font-black ${
                    attendancePercentage >= 85
                      ? 'text-emerald-400'
                      : attendancePercentage >= 70
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {attendancePercentage}%
                </div>
                <span className="text-xs text-zinc-400 font-medium">Turnout Rate</span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${(presentCount / (totalEnrolled || 1)) * 100}%` }}
                title={`Present: ${presentCount}`}
              />
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{ width: `${(lateCount / (totalEnrolled || 1)) * 100}%` }}
                title={`Late: ${lateCount}`}
              />
            </div>

            {/* Stat Counters */}
            <div className="grid grid-cols-4 gap-2 pt-2 text-center">
              <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/20">
                <div className="text-lg font-black text-emerald-400">{presentCount}</div>
                <div className="text-[10px] font-bold text-emerald-400 uppercase">Present</div>
              </div>
              <div className="bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/20">
                <div className="text-lg font-black text-amber-400">{lateCount}</div>
                <div className="text-[10px] font-bold text-amber-400 uppercase">Late</div>
              </div>
              <div className="bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/20">
                <div className="text-lg font-black text-rose-400">{absentCount}</div>
                <div className="text-[10px] font-bold text-rose-400 uppercase">Absent</div>
              </div>
              <div className="bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-500/20">
                <div className="text-lg font-black text-indigo-400">{excusedCount}</div>
                <div className="text-[10px] font-bold text-indigo-400 uppercase">Excused</div>
              </div>
            </div>
          </div>

          {/* Real-time Attendee Feed */}
          <div className="bg-[#18181b] rounded-3xl border border-[#27272a] shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#27272a] bg-[#27272a]/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-sm text-[#fafafa]">
                  Checked-in Students ({sessionRecords.length})
                </h4>
              </div>
              <span className="text-xs text-zinc-400 font-medium">Real-time Stream</span>
            </div>

            <div className="divide-y divide-[#27272a] max-h-96 overflow-y-auto">
              {sessionRecords.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 space-y-1">
                  <Clock className="w-8 h-8 mx-auto text-zinc-600 stroke-1" />
                  <p className="text-xs font-semibold text-zinc-300">Waiting for first scan...</p>
                  <p className="text-[11px] text-zinc-500">
                    Students will appear here instantly upon QR verification.
                  </p>
                </div>
              ) : (
                sessionRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 hover:bg-[#27272a]/40 transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center font-bold text-emerald-400 uppercase text-xs border border-zinc-700">
                        {rec.studentName[0]}
                      </div>
                      <div>
                        <div className="font-bold text-[#fafafa]">{rec.studentName}</div>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-emerald-400">{rec.studentNumber}</span>
                          {rec.checkInTime && (
                            <span>
                              •{' '}
                              {new Date(rec.checkInTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          )}
                          {rec.location?.isValid && (
                            <span className="text-emerald-400 flex items-center gap-0.5">
                              • <MapPin className="w-3 h-3" /> GPS Valid
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
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

                      <button
                        onClick={() => handleManualEdit(rec)}
                        className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                        title="Manually Correct Status"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Status Adjustment Modal */}
      {selectedStudentForEdit && (
        <ManualAttendanceModal
          isOpen={true}
          onClose={() => setSelectedStudentForEdit(null)}
          recordId={selectedStudentForEdit.recordId}
          sessionId={session.id}
          student={selectedStudentForEdit.student}
          courseId={session.courseId}
          courseCode={session.courseCode}
          currentStatus={selectedStudentForEdit.currentStatus}
        />
      )}
    </div>
  );
};
