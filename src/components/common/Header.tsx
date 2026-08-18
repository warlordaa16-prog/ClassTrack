import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import {
  QrCode,
  Bell,
  Wifi,
  WifiOff,
  UserCheck,
  ChevronDown,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  BookOpen,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { UserRole } from '../../types';

interface HeaderProps {
  onOpenRoleModal: () => void;
  onOpenNotifications: () => void;
  onOpenScanModal?: () => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenRoleModal,
  onOpenNotifications,
  onOpenScanModal,
  currentTab,
  setCurrentTab,
}) => {
  const { currentUser, isOnline, switchRole } = useAuth();
  const { notifications, offlineQueueCount, syncOfflineRecords, sessions } = useAttendance();
  const [isSyncing, setIsSyncing] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const activeLiveSessionsCount = sessions.filter((s) => s.isOpen).length;

  const handleSyncOffline = async () => {
    if (!currentUser) return;
    setIsSyncing(true);
    await syncOfflineRecords(currentUser);
    setIsSyncing(false);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'STUDENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <GraduationCap className="w-3 h-3" /> Student
          </span>
        );
      case 'COORDINATOR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <BookOpen className="w-3 h-3" /> Coordinator
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-3 h-3" /> Administrator
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#09090b]/80 backdrop-blur-md border-b border-[#27272a] text-[#fafafa] shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black text-xl tracking-tight">
              <QrCode className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-[#fafafa] flex items-center gap-1">
                  Class<span className="text-emerald-400">Track</span>
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Firebase Live
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Institutional QR Attendance & Academic Platform
              </p>
            </div>
          </div>

          {/* Quick Stats & Role Navigation Tabs */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Offline sync badge if any */}
            {offlineQueueCount > 0 && (
              <button
                onClick={handleSyncOffline}
                disabled={isSyncing || !isOnline}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium hover:bg-amber-500/20 transition cursor-pointer"
                title="Sync cached offline scans"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync ({offlineQueueCount})</span>
              </button>
            )}

            {/* Live Session Alert Pill for Students */}
            {currentUser?.role === 'STUDENT' && activeLiveSessionsCount > 0 && (
              <button
                onClick={onOpenScanModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-black font-bold rounded-lg text-xs hover:bg-emerald-400 transition shadow-sm animate-pulse cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>Scan Live Class ({activeLiveSessionsCount})</span>
              </button>
            )}

            {/* Online/Offline status icon */}
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono border ${
                isOnline
                  ? 'bg-[#18181b] text-emerald-400 border-[#27272a]'
                  : 'bg-rose-950/40 text-rose-300 border-rose-800/40'
              }`}
              title={isOnline ? 'Connected to Firebase' : 'Working Offline'}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Offline</span>
                </>
              )}
            </div>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-zinc-300 hover:text-white bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] rounded-lg transition cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Role Switcher & User Profile Pill */}
            {currentUser && (
              <button
                onClick={onOpenRoleModal}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] rounded-xl transition text-left group cursor-pointer"
              >
                <img
                  src={
                    currentUser.avatarUrl ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.name}`
                  }
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-lg object-cover ring-1 ring-zinc-700"
                  referrerPolicy="no-referrer"
                />
                <div className="hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-200 group-hover:text-white">
                      {currentUser.name}
                    </span>
                    <ChevronDown className="w-3 h-3 text-zinc-400 group-hover:text-white transition" />
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    {currentUser.studentNumber || currentUser.staffId || currentUser.role}
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
