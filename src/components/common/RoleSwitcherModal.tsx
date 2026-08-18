import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import {
  X,
  GraduationCap,
  UserCheck,
  BookOpen,
  ShieldCheck,
  Check,
  UserPlus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { User, UserRole } from '../../types';

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, users, switchUser, addUser } = useAuth();
  const { departments } = useAttendance();
  const [activeTab, setActiveTab] = useState<'switch' | 'create'>('switch');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<UserRole | 'ALL'>('ALL');

  // Form state for creating a user
  const [newRole, setNewRole] = useState<UserRole>('STUDENT');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDeptId, setNewDeptId] = useState(departments[0]?.id || 'dept-cs');
  const [newIdNumber, setNewIdNumber] = useState('');

  if (!isOpen) return null;

  const filteredUsers = users.filter((u) =>
    selectedRoleFilter === 'ALL' ? true : u.role === selectedRoleFilter
  );

  const handleSelectUser = (user: User) => {
    switchUser(user.id);
    onClose();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const created = await addUser({
      name: newName.trim(),
      email: newEmail.trim(),
      role: newRole,
      departmentId: newDeptId,
      studentNumber: newRole === 'STUDENT' ? newIdNumber || `CT-2024-${Math.floor(1000 + Math.random() * 9000)}` : undefined,
      staffId: newRole !== 'STUDENT' ? newIdNumber || `ST-${Math.floor(100 + Math.random() * 900)}` : undefined,
    });

    switchUser(created.id);
    setActiveTab('switch');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#18181b] rounded-2xl shadow-2xl max-w-xl w-full border border-[#27272a] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#09090b] text-[#fafafa] flex items-center justify-between border-b border-[#27272a]">
          <div>
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Role & Account Switcher
            </h3>
            <p className="text-xs text-zinc-400">
              Easily toggle between institutional personas or create test profiles
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#27272a] bg-[#09090b]/50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('switch')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'switch'
                ? 'bg-[#18181b] border-emerald-500 text-white shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Select Existing Profile ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'create'
                ? 'bg-[#18181b] border-emerald-500 text-white shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add New Test User
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'switch' ? (
            <div>
              {/* Role filter buttons */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(['ALL', 'STUDENT', 'COORDINATOR', 'ADMIN'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRoleFilter(r)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                      selectedRoleFilter === r
                        ? 'bg-zinc-100 text-black font-bold'
                        : 'bg-[#27272a] text-zinc-400 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    {r === 'ALL' ? 'All Roles' : r}
                  </button>
                ))}
              </div>

              {/* Users list */}
              <div className="space-y-2">
                {filteredUsers.map((u) => {
                  const isSelected = currentUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500/80 bg-emerald-950/30 shadow-sm ring-1 ring-emerald-500/50'
                          : 'border-[#27272a] bg-[#18181b] hover:border-zinc-700 hover:bg-[#27272a]/50'
                      }`}
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
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#fafafa]">{u.name}</span>
                            {isSelected && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-500 text-black text-[10px] font-bold rounded">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] font-medium text-zinc-300">
                              {u.studentNumber || u.staffId || 'ID: ' + u.id.substring(0, 8)}
                            </span>
                            <span>•</span>
                            <span>{u.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                            u.role === 'STUDENT'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : u.role === 'COORDINATOR'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {u.role}
                        </span>
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  Institutional Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['STUDENT', 'COORDINATOR', 'ADMIN'] as const).map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setNewRole(r)}
                      className={`p-2.5 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                        newRole === r
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 ring-1 ring-emerald-500'
                          : 'border-[#27272a] bg-[#18181b] text-zinc-400 hover:bg-[#27272a]'
                      }`}
                    >
                      {r === 'STUDENT' && <GraduationCap className="w-4 h-4 text-emerald-400" />}
                      {r === 'COORDINATOR' && <BookOpen className="w-4 h-4 text-purple-400" />}
                      {r === 'ADMIN' && <ShieldCheck className="w-4 h-4 text-amber-400" />}
                      <span>{r}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Smith"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#09090b] border border-[#27272a] rounded-lg text-sm text-[#fafafa] placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. jordan.smith@classtrack.edu"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#09090b] border border-[#27272a] rounded-lg text-sm text-[#fafafa] placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <select
                    value={newDeptId}
                    onChange={(e) => setNewDeptId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#09090b] border border-[#27272a] rounded-lg text-sm text-[#fafafa] focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id} className="bg-[#18181b]">
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    {newRole === 'STUDENT' ? 'Student ID Number' : 'Staff ID Number'}
                  </label>
                  <input
                    type="text"
                    placeholder={newRole === 'STUDENT' ? 'e.g. CT-2024-9901' : 'e.g. ST-501'}
                    value={newIdNumber}
                    onChange={(e) => setNewIdNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-[#09090b] border border-[#27272a] rounded-lg text-sm text-[#fafafa] placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-sm transition shadow-sm cursor-pointer"
                >
                  Create & Switch To Profile
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
