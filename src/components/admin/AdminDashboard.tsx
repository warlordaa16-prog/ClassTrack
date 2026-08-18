import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import {
  ShieldCheck,
  Users,
  BookOpen,
  Building,
  FileText,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Check,
  Search,
  History,
  MapPin,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { User, Course, Department, UserRole } from '../../types';

export const AdminDashboard: React.FC = () => {
  const { users, addUser } = useAuth();
  const {
    courses,
    departments,
    semesters,
    auditLogs,
    addCourse,
    addDepartment,
    enrollStudentInCourse,
    unenrollStudentFromCourse,
  } = useAttendance();

  const [activeAdminTab, setActiveAdminTab] = useState<
    'users' | 'academics' | 'enrollments' | 'audits' | 'settings'
  >('users');

  const [userRoleFilter, setUserRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [userSearch, setUserSearch] = useState('');

  // Form modals / state
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCredits, setNewCourseCredits] = useState(3);
  const [newCourseSchedule, setNewCourseSchedule] = useState('Mon, Wed 10:00 AM - 11:30 AM');
  const [newCourseRoom, setNewCourseRoom] = useState('Science Bldg Room 102');
  const [newCourseCoordinatorId, setNewCourseCoordinatorId] = useState(
    users.find((u) => u.role === 'COORDINATOR')?.id || ''
  );
  const [newCourseDeptId, setNewCourseDeptId] = useState(departments[0]?.id || 'dept-cs');

  // Audit search
  const [auditSearch, setAuditSearch] = useState('');

  const coordinators = users.filter((u) => u.role === 'COORDINATOR');
  const students = users.filter((u) => u.role === 'STUDENT');

  const filteredUsers = users.filter((u) => {
    const matchesRole = userRoleFilter === 'ALL' ? true : u.role === userRoleFilter;
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.studentNumber && u.studentNumber.toLowerCase().includes(userSearch.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseCode || !newCourseName) return;

    const coordinator = users.find((u) => u.id === newCourseCoordinatorId);
    const activeSem = semesters.find((s) => s.isActive) || semesters[0];

    await addCourse({
      code: newCourseCode.trim(),
      name: newCourseName.trim(),
      credits: Number(newCourseCredits),
      departmentId: newCourseDeptId,
      semesterId: activeSem.id,
      coordinatorId: newCourseCoordinatorId,
      coordinatorName: coordinator?.name || 'Department Coordinator',
      lecturerId: newCourseCoordinatorId,
      lecturerName: coordinator?.name || 'Department Coordinator',
      schedule: newCourseSchedule,
      room: newCourseRoom,
      totalClassesExpected: 24,
      enrolledStudentIds: [],
    });

    setShowAddCourse(false);
    setNewCourseCode('');
    setNewCourseName('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#fafafa] flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            Institutional Administration Panel
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Enterprise management for academic departments, users, courses, and security audits
          </p>
        </div>
      </div>

      {/* Admin Sub-navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#27272a] pb-3">
        {[
          { id: 'users', label: `Users & Directory (${users.length})`, icon: Users },
          { id: 'academics', label: `Courses & Academics (${courses.length})`, icon: BookOpen },
          { id: 'enrollments', label: 'Roster & Enrollment', icon: Calendar },
          { id: 'audits', label: `Audit Trail (${auditLogs.length})`, icon: History },
          { id: 'settings', label: 'System Settings', icon: Settings },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveAdminTab(id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeAdminTab === id
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black shadow-xs'
                : 'bg-[#18181b] text-zinc-400 hover:bg-[#27272a] hover:text-[#fafafa] border border-[#27272a]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Users & Directory */}
      {activeAdminTab === 'users' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-[#18181b] p-4 rounded-2xl border border-[#27272a] shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user name, email, ID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#27272a]/60 border border-zinc-700 text-[#fafafa] rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
              {(['ALL', 'STUDENT', 'COORDINATOR', 'ADMIN'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setUserRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    userRoleFilter === r
                      ? 'bg-emerald-500 text-black'
                      : 'bg-[#27272a]/80 text-zinc-400 hover:bg-[#27272a] hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#18181b] rounded-3xl border border-[#27272a] shadow-sm overflow-hidden">
            <div className="divide-y divide-zinc-800">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-4 sm:p-5 hover:bg-[#27272a]/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        u.avatarUrl ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`
                      }
                      alt={u.name}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-zinc-700"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="font-bold text-[#fafafa] text-sm">{u.name}</div>
                      <div className="text-zinc-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-medium text-emerald-400">
                          {u.studentNumber || u.staffId || 'ID: ' + u.id.substring(0, 8)}
                        </span>
                        <span>•</span>
                        <span>{u.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                        u.role === 'STUDENT'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : u.role === 'COORDINATOR'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Courses & Academics */}
      {activeAdminTab === 'academics' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-base text-[#fafafa]">Academic Courses Directory</h3>
            <button
              onClick={() => setShowAddCourse(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add New Course
            </button>
          </div>

          {showAddCourse && (
            <form
              onSubmit={handleCreateCourse}
              className="bg-[#18181b] p-6 rounded-3xl border border-[#27272a] space-y-4 animate-scale-in"
            >
              <h4 className="font-bold text-sm text-[#fafafa]">Create Academic Course</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS-405"
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-700 rounded-xl text-xs outline-none bg-[#27272a]/60 text-[#fafafa]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Course Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Distributed Cloud Computing"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-700 rounded-xl text-xs outline-none bg-[#27272a]/60 text-[#fafafa]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Course Coordinator
                  </label>
                  <select
                    value={newCourseCoordinatorId}
                    onChange={(e) => setNewCourseCoordinatorId(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-700 rounded-xl text-xs outline-none bg-[#27272a]/60 text-[#fafafa]"
                  >
                    {coordinators.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#18181b] text-white">
                        {c.name} ({c.staffId || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={newCourseCredits}
                    onChange={(e) => setNewCourseCredits(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-zinc-700 rounded-xl text-xs outline-none bg-[#27272a]/60 text-[#fafafa]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCourse(false)}
                  className="px-4 py-2 border border-zinc-700 text-zinc-300 text-xs font-bold rounded-xl hover:bg-[#27272a] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save Course
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((c) => (
              <div
                key={c.id}
                className="bg-[#18181b] p-5 rounded-3xl border border-[#27272a] shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-xs">
                    {c.code}
                  </span>
                  <span className="text-xs text-zinc-400 font-semibold">
                    {c.enrolledStudentIds.length} Students Enrolled
                  </span>
                </div>
                <h4 className="font-bold text-base text-[#fafafa]">{c.name}</h4>
                <p className="text-xs text-zinc-400">Lecturer: {c.lecturerName}</p>
                <p className="text-xs text-zinc-400">
                  {c.schedule} • {c.room}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Roster & Enrollments */}
      {activeAdminTab === 'enrollments' && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="font-bold text-base text-[#fafafa]">Manage Course Student Enrollments</h3>
          <div className="space-y-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-[#18181b] rounded-3xl p-6 border border-[#27272a] shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold bg-[#27272a] text-[#fafafa] px-2 py-0.5 rounded">
                      {course.code}
                    </span>
                    <h4 className="font-bold text-base text-[#fafafa] mt-1">{course.name}</h4>
                  </div>
                  <span className="text-xs font-semibold text-zinc-400">
                    {course.enrolledStudentIds.length} / {students.length} Students Enrolled
                  </span>
                </div>

                {/* Enrollment checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-[#27272a]">
                  {students.map((student) => {
                    const isEnrolled = course.enrolledStudentIds.includes(student.id);
                    return (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => {
                          if (isEnrolled) {
                            unenrollStudentFromCourse(course.id, student.id);
                          } else {
                            enrollStudentInCourse(course.id, student.id);
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between cursor-pointer ${
                          isEnrolled
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold'
                            : 'bg-[#27272a]/30 border-zinc-800 text-zinc-400 hover:bg-[#27272a]'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-bold text-[#fafafa]">{student.name}</div>
                          <div className="text-[10px] text-zinc-400 font-mono">
                            {student.studentNumber}
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center ${
                            isEnrolled ? 'bg-emerald-500 text-black' : 'border border-zinc-700'
                          }`}
                        >
                          {isEnrolled && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Audit Trail Viewer (Section 23) */}
      {activeAdminTab === 'audits' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-[#fafafa] flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                Immutable Attendance Audit Trail
              </h3>
              <p className="text-xs text-zinc-400">
                Full chronological ledger tracking every manual modification, author, and reason
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search audit records..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#27272a]/60 border border-zinc-700 text-[#fafafa] rounded-xl text-xs outline-none"
              />
            </div>
          </div>

          <div className="bg-[#18181b] rounded-3xl border border-[#27272a] shadow-sm overflow-hidden">
            {auditLogs.length === 0 ? (
              <p className="text-center py-12 text-xs text-zinc-500">No audit logs recorded yet.</p>
            ) : (
              <div className="divide-y divide-zinc-800">
                {auditLogs
                  .filter(
                    (a) =>
                      a.studentName.toLowerCase().includes(auditSearch.toLowerCase()) ||
                      a.courseCode.toLowerCase().includes(auditSearch.toLowerCase()) ||
                      a.performedByName.toLowerCase().includes(auditSearch.toLowerCase())
                  )
                  .map((log) => (
                    <div key={log.id} className="p-4 sm:p-5 hover:bg-[#27272a]/40 transition text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                            {log.action}
                          </span>
                          <span className="font-bold text-[#fafafa]">{log.studentName}</span>
                          <span className="text-zinc-400 font-mono">({log.studentNumber})</span>
                          <span className="text-zinc-500">•</span>
                          <span className="font-bold text-emerald-400">{log.courseCode}</span>
                        </div>

                        <span className="text-[11px] text-zinc-500 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-4 text-zinc-300 bg-[#27272a]/40 p-2.5 rounded-xl border border-zinc-800">
                        <div>
                          <span className="text-zinc-400">Status Change: </span>
                          <span className="font-bold text-zinc-200">{log.oldStatus}</span>
                          <span className="mx-1 text-zinc-500">→</span>
                          <span className="font-bold text-emerald-400">{log.newStatus}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Modified By: </span>
                          <span className="font-semibold text-zinc-200">
                            {log.performedByName} ({log.performedByRole})
                          </span>
                        </div>
                        <div className="w-full text-zinc-300">
                          <span className="text-zinc-400">Reason: </span>
                          <span className="italic">"{log.reason}"</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: System Settings */}
      {activeAdminTab === 'settings' && (
        <div className="bg-[#18181b] rounded-3xl p-6 border border-[#27272a] shadow-sm space-y-6 animate-fade-in max-w-2xl">
          <div>
            <h3 className="font-bold text-base text-[#fafafa]">Institutional System Settings</h3>
            <p className="text-xs text-zinc-400">
              Configure attendance thresholds, geofencing parameters, and database state
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#27272a]/40 border border-[#27272a] space-y-2">
              <span className="font-bold text-[#fafafa]">Minimum Exam Eligibility Threshold</span>
              <p className="text-zinc-400">
                Institutional requirement for students to sit for final semester examinations.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={80}
                  className="w-20 px-3 py-1.5 border border-zinc-700 rounded-lg font-bold text-[#fafafa] bg-[#18181b]"
                />
                <span className="font-bold text-zinc-300">% Attendance</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#27272a]/40 border border-[#27272a] space-y-2">
              <span className="font-bold text-[#fafafa]">Default Late Arrival Threshold</span>
              <p className="text-zinc-400">
                Minutes elapsed from class start time before a student check-in is logged as LATE.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={15}
                  className="w-20 px-3 py-1.5 border border-zinc-700 rounded-lg font-bold text-[#fafafa] bg-[#18181b]"
                />
                <span className="font-bold text-zinc-300">Minutes</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#27272a]/40 border border-[#27272a] space-y-2">
              <span className="font-bold text-[#fafafa]">Database & Firebase Status</span>
              <p className="text-zinc-400">
                Connected to project <span className="font-mono font-bold text-emerald-400">glassy-saga-n07pf</span> with real-time Firestore sync and offline queue cache.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                <Check className="w-3.5 h-3.5" /> Firebase Firestore Online
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
