import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import {
  FileText,
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { AttendanceStatus } from '../../types';

export const ReportsView: React.FC = () => {
  const { users } = useAuth();
  const { courses, sessions, records, departments } = useAttendance();

  const [selectedCourseId, setSelectedCourseId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter records
  const filteredRecords = records.filter((rec) => {
    const matchesCourse = selectedCourseId === 'ALL' ? true : rec.courseId === selectedCourseId;
    const matchesStatus = selectedStatus === 'ALL' ? true : rec.status === selectedStatus;
    const matchesSearch =
      rec.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.studentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.courseCode.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCourse && matchesStatus && matchesSearch;
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Record ID',
      'Course Code',
      'Student Name',
      'Student ID',
      'Status',
      'Check-in Time',
      'Minutes Late',
      'Verification Method',
      'GPS Validated',
      'Distance (Meters)',
      'Notes',
    ];

    const rows = filteredRecords.map((r) => [
      r.id,
      r.courseCode,
      `"${r.studentName}"`,
      r.studentNumber,
      r.status,
      r.checkInTime ? new Date(r.checkInTime).toISOString() : 'N/A',
      r.minutesLate || 0,
      r.verificationMethod,
      r.location?.isValid ? 'YES' : 'NO',
      r.location?.distanceMeters || '',
      `"${r.notes || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `ClassTrack_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in print:p-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-[#fafafa] flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-400" />
            Institutional Attendance Reports
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Export official attendance sheets, CSV audits, and printable rosters
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-[#18181b] hover:bg-[#27272a] border border-zinc-700 text-zinc-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV Spreadsheet
          </button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block border-b-2 border-zinc-700 pb-4 mb-4">
        <h1 className="text-xl font-bold text-white">ClassTrack Institutional Attendance Ledger</h1>
        <p className="text-xs text-zinc-400">
          Generated: {new Date().toLocaleString()} • Official Academic Record
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#18181b] p-4 rounded-2xl border border-[#27272a] shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between print:hidden">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student, course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#27272a]/60 border border-zinc-700 text-[#fafafa] rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="px-3 py-2 border border-zinc-700 rounded-xl text-xs bg-[#27272a]/60 text-[#fafafa] font-semibold outline-none"
          >
            <option value="ALL" className="bg-[#18181b] text-white">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#18181b] text-white">
                {c.code} - {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-3 py-2 border border-zinc-700 rounded-xl text-xs bg-[#27272a]/60 text-[#fafafa] font-semibold outline-none"
          >
            <option value="ALL" className="bg-[#18181b] text-white">All Statuses</option>
            <option value="PRESENT" className="bg-[#18181b] text-white">PRESENT</option>
            <option value="LATE" className="bg-[#18181b] text-white">LATE</option>
            <option value="ABSENT" className="bg-[#18181b] text-white">ABSENT</option>
            <option value="EXCUSED" className="bg-[#18181b] text-white">EXCUSED</option>
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-[#18181b] rounded-3xl border border-[#27272a] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#09090b] text-zinc-300 font-bold uppercase tracking-wider text-[10px] border-b border-[#27272a]">
              <tr>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">ID Number</th>
                <th className="py-3.5 px-4">Course</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Verification</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    No matching attendance records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-[#27272a]/40 transition">
                    <td className="py-3 px-4 font-bold text-[#fafafa]">{r.studentName}</td>
                    <td className="py-3 px-4 font-mono font-medium text-emerald-400">{r.studentNumber}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {r.courseCode}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {r.checkInTime ? (
                        <div>
                          <div>
                            {new Date(r.checkInTime).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500">
                            {new Date(r.checkInTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-medium text-zinc-300 bg-[#27272a] border border-zinc-700/50 px-2 py-0.5 rounded">
                        {r.verificationMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                          r.status === 'PRESENT'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : r.status === 'LATE'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : r.status === 'ABSENT'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
