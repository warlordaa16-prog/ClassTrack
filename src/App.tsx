import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AttendanceProvider, useAttendance } from './context/AttendanceContext';
import { Header } from './components/common/Header';
import { RoleSwitcherModal } from './components/common/RoleSwitcherModal';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { StudentDashboard } from './components/student/StudentDashboard';
import { StudentCoursesView } from './components/student/StudentCoursesView';
import { StudentHistoryView } from './components/student/StudentHistoryView';
import { QRScannerModal } from './components/student/QRScannerModal';
import { LiveSessionView } from './components/lecturer/LiveSessionView';
import { CoordinatorDashboard } from './components/coordinator/CoordinatorDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ReportsView } from './components/reports/ReportsView';
import {
  Home,
  BookOpen,
  History,
  QrCode,
  BarChart3,
  ShieldCheck,
  FileText,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, isOnline } = useAuth();
  const { isLoading, offlineQueueCount, syncOfflineRecords } = useAttendance();

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [activeLiveSessionId, setActiveLiveSessionId] = useState<string | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState<boolean>(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/20 text-slate-950">
          <QrCode className="w-7 h-7 animate-pulse text-black" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-[#fafafa]">ClassTrack Smart Attendance</h2>
          <p className="text-xs text-zinc-400">Connecting to Firebase Firestore...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  const role = currentUser.role;

  // Determine navigation tabs based on user role
  const getNavTabs = () => {
    switch (role) {
      case 'STUDENT':
        return [
          { id: 'dashboard', label: 'Student Portal', icon: Home },
          { id: 'courses', label: 'My Enrolled Courses', icon: BookOpen },
          { id: 'history', label: 'Attendance Records', icon: History },
        ];
      case 'COORDINATOR':
        return [
          { id: 'dashboard', label: 'Coordinator Hub', icon: BarChart3 },
          { id: 'reports', label: 'Departmental Reports', icon: FileText },
        ];
      case 'ADMIN':
        return [
          { id: 'dashboard', label: 'Admin Control Center', icon: ShieldCheck },
          { id: 'coordinator', label: 'Coordinator Radar', icon: BarChart3 },
          { id: 'reports', label: 'Institutional Reports', icon: FileText },
        ];
    }
  };

  const navTabs = getNavTabs();

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Header */}
      <Header
        onOpenRoleModal={() => setIsRoleModalOpen(true)}
        onOpenNotifications={() => setIsNotifDrawerOpen(true)}
        onOpenScanModal={() => setIsScanModalOpen(true)}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />

      {/* Offline Alert Strip if Offline */}
      {!isOnline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-300 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs">
          <span>You are currently working in Offline PWA Mode. Attendance scans will be stored locally in IndexedDB/cache and synced upon reconnection.</span>
          {offlineQueueCount > 0 && (
            <span className="bg-amber-500/20 border border-amber-500/30 text-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
              {offlineQueueCount} queued
            </span>
          )}
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex-1 flex flex-col md:flex-row gap-6">
        {/* Left Desktop Sidebar Navigation */}
        <aside className="hidden md:block w-60 shrink-0 space-y-6">
          <div className="bg-[#18181b] rounded-3xl p-4 border border-[#27272a] shadow-xs space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {role} Navigation
            </div>
            {navTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setCurrentTab(id);
                  setActiveLiveSessionId(null);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition text-left cursor-pointer ${
                  currentTab === id && !activeLiveSessionId
                    ? 'bg-[#27272a] text-[#fafafa] border border-zinc-700/50 shadow-xs'
                    : 'text-zinc-400 hover:bg-[#27272a]/50 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </button>
            ))}

            {/* Student Floating Scan Button in Sidebar */}
            {role === 'STUDENT' && (
              <div className="pt-3">
                <button
                  onClick={() => setIsScanModalOpen(true)}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-black" />
                  <span>Scan Attendance</span>
                </button>
              </div>
            )}
          </div>

          {/* Persona Card Quick Info */}
          <div className="bg-[#18181b] text-white rounded-3xl p-4 border border-[#27272a] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 uppercase">Active Role</span>
              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="text-[10px] text-zinc-400 hover:text-white underline font-semibold cursor-pointer"
              >
                Switch
              </button>
            </div>
            <div className="font-bold text-sm text-[#fafafa]">{currentUser.name}</div>
            <div className="text-[11px] text-zinc-400 font-mono">
              {currentUser.studentNumber || currentUser.staffId || currentUser.email}
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex overflow-x-auto gap-2 pb-2 scrollbar-none">
          {navTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setCurrentTab(id);
                setActiveLiveSessionId(null);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                currentTab === id && !activeLiveSessionId
                  ? 'bg-[#27272a] text-[#fafafa] border border-zinc-700/50 shadow-xs'
                  : 'bg-[#18181b] text-zinc-400 border border-[#27272a]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 min-w-0">
          {/* Active Live Session Projector View */}
          {activeLiveSessionId ? (
            <LiveSessionView
              sessionId={activeLiveSessionId}
              onBack={() => setActiveLiveSessionId(null)}
            />
          ) : (
            <>
              {/* STUDENT VIEWS */}
              {role === 'STUDENT' && (
                <>
                  {currentTab === 'dashboard' && (
                    <StudentDashboard
                      onOpenScanModal={() => setIsScanModalOpen(true)}
                      onNavigateToTab={(tab) => setCurrentTab(tab)}
                    />
                  )}
                  {currentTab === 'courses' && <StudentCoursesView />}
                  {currentTab === 'history' && <StudentHistoryView />}
                </>
              )}

              {/* COORDINATOR VIEWS */}
              {role === 'COORDINATOR' && (
                <>
                  {currentTab === 'dashboard' && (
                    <CoordinatorDashboard
                      onOpenLiveSession={(sId) => setActiveLiveSessionId(sId)}
                      onNavigateToReports={() => setCurrentTab('reports')}
                    />
                  )}
                  {currentTab === 'reports' && <ReportsView />}
                </>
              )}

              {/* ADMIN VIEWS */}
              {role === 'ADMIN' && (
                <>
                  {currentTab === 'dashboard' && <AdminDashboard />}
                  {currentTab === 'coordinator' && (
                    <CoordinatorDashboard
                      onOpenLiveSession={(sId) => setActiveLiveSessionId(sId)}
                      onNavigateToReports={() => setCurrentTab('reports')}
                    />
                  )}
                  {currentTab === 'reports' && <ReportsView />}
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* Floating Bottom Action Bar for Mobile Students */}
      {role === 'STUDENT' && !activeLiveSessionId && (
        <div className="md:hidden fixed bottom-4 right-4 left-4 z-40">
          <button
            onClick={() => setIsScanModalOpen(true)}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black rounded-2xl text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 active:scale-98 transition cursor-pointer"
          >
            <QrCode className="w-5 h-5 text-black" />
            <span>Scan Attendance QR Code</span>
          </button>
        </div>
      )}

      {/* Global Modals */}
      <RoleSwitcherModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
      />

      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        onNavigateToScan={() => setIsScanModalOpen(true)}
      />

      <QRScannerModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AttendanceProvider>
        <AppContent />
      </AttendanceProvider>
    </AuthProvider>
  );
}
