import React from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { AppNotification } from '../../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToScan?: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateToScan,
}) => {
  const { notifications, markNotificationRead } = useAttendance();
  const { currentUser } = useAuth();

  if (!isOpen) return null;

  // Filter notifications relevant to current user or ALL
  const userNotifs = notifications.filter(
    (n) => n.userId === 'ALL' || (currentUser && n.userId === currentUser.id)
  );

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'WARNING':
      case 'ALERT':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'SUCCESS':
        return <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'INFO':
      default:
        return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-full max-w-md bg-[#18181b] h-full shadow-2xl flex flex-col border-l border-[#27272a]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#09090b] text-[#fafafa] flex items-center justify-between border-b border-[#27272a]">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-white">Institutional Notifications</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {userNotifs.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Bell className="w-10 h-10 mx-auto mb-2 text-zinc-600 stroke-1" />
              <p className="text-sm font-medium text-zinc-300">No active notifications</p>
              <p className="text-xs text-zinc-500">You're all caught up!</p>
            </div>
          ) : (
            userNotifs.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  markNotificationRead(notif.id);
                  if (notif.link === 'attendance-scan' && onNavigateToScan) {
                    onNavigateToScan();
                    onClose();
                  }
                }}
                className={`p-4 rounded-xl border transition cursor-pointer relative ${
                  notif.isRead
                    ? 'bg-[#18181b] border-[#27272a] opacity-75'
                    : 'bg-[#27272a]/50 border-zinc-700 shadow-sm ring-1 ring-emerald-500/20'
                }`}
              >
                {!notif.isRead && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-emerald-400 rounded-full" />
                )}
                <div className="flex items-start gap-3">
                  {getIcon(notif.type)}
                  <div className="flex-1 pr-3">
                    <h4 className="text-sm font-bold text-[#fafafa]">{notif.title}</h4>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{notif.message}</p>
                    <div className="flex items-center justify-between mt-3 text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {notif.link === 'attendance-scan' && (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                          Scan Now <ExternalLink className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
