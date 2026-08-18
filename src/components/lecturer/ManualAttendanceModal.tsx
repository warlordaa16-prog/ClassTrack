import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import { X, ShieldAlert, CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { AttendanceStatus, User } from '../../types';

interface ManualAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string | null;
  sessionId: string;
  student: User;
  courseId: string;
  courseCode: string;
  currentStatus: AttendanceStatus | 'NONE';
}

export const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({
  isOpen,
  onClose,
  recordId,
  sessionId,
  student,
  courseId,
  courseCode,
  currentStatus,
}) => {
  const { currentUser } = useAuth();
  const { correctAttendanceStatus } = useAttendance();

  const [newStatus, setNewStatus] = useState<AttendanceStatus>(
    currentStatus === 'NONE' ? 'PRESENT' : (currentStatus as AttendanceStatus)
  );
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      await correctAttendanceStatus(
        recordId,
        sessionId,
        student,
        courseId,
        courseCode,
        newStatus,
        reason.trim(),
        currentUser
      );
      onClose();
    } catch (err) {
      console.error('Failed to correct attendance:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#18181b] rounded-3xl shadow-2xl max-w-md w-full border border-[#27272a] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#09090b] text-[#fafafa] flex items-center justify-between border-b border-[#27272a]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base text-white">Manual Status Correction</h3>
              <p className="text-xs text-zinc-400">Audited attendance alteration</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-[#27272a]/50 p-3.5 rounded-2xl border border-[#27272a] text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-400">Student:</span>
              <span className="font-bold text-[#fafafa]">{student.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Student ID:</span>
              <span className="font-mono font-bold text-emerald-400">{student.studentNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Course:</span>
              <span className="font-bold text-emerald-400">{courseCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Current Status:</span>
              <span className="font-bold text-[#fafafa]">{currentStatus}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Select New Attendance Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as const).map((st) => (
                <button
                  type="button"
                  key={st}
                  onClick={() => setNewStatus(st)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    newStatus === st
                      ? st === 'PRESENT'
                        ? 'bg-emerald-500 text-black border-emerald-500 shadow-xs'
                        : st === 'LATE'
                        ? 'bg-amber-500 text-black border-amber-500 shadow-xs'
                        : st === 'ABSENT'
                        ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                        : 'bg-indigo-500 text-white border-indigo-500 shadow-xs'
                      : 'border-zinc-700 bg-[#27272a]/40 text-zinc-300 hover:bg-[#27272a]'
                  }`}
                >
                  {st === 'PRESENT' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {st === 'LATE' && <Clock className="w-3.5 h-3.5" />}
                  {st === 'ABSENT' && <XCircle className="w-3.5 h-3.5" />}
                  {st === 'EXCUSED' && <AlertTriangle className="w-3.5 h-3.5" />}
                  <span>{st}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
              Audit Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Approved medical clearance note or verified camera malfunction"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 bg-[#27272a]/60 border border-zinc-700 text-[#fafafa] rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <p className="text-[10px] text-zinc-400 mt-1">
              Required for compliance. This reason will be logged in the permanent audit trail with your name.
            </p>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-zinc-700 text-zinc-300 font-bold rounded-xl text-xs hover:bg-[#27272a] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 text-black font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
            >
              Confirm & Log Audit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
