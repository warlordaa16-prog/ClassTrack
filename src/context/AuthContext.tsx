import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { INITIAL_USERS } from '../lib/mockData';
import { getLocal, setLocal, saveUser } from '../lib/storage';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isOnline: boolean;
  setCurrentUser: (user: User | null) => void;
  switchRole: (role: UserRole) => void;
  switchUser: (userId: string) => void;
  addUser: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<User>;
  updateProfile: (updated: Partial<User>) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => getLocal('users', INITIAL_USERS));
  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    const savedId = localStorage.getItem('classtrack_current_user_id');
    const localUsers = getLocal<User[]>('users', INITIAL_USERS);
    if (savedId) {
      const found = localUsers.find((u) => u.id === savedId);
      if (found) return found;
    }
    // Default to student Alex Rivera for instant scanning experience
    return localUsers.find((u) => u.id === 'u-student-1') || localUsers[0] || null;
  });

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setCurrentUser = (user: User | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem('classtrack_current_user_id', user.id);
    } else {
      localStorage.removeItem('classtrack_current_user_id');
    }
  };

  const switchRole = (role: UserRole) => {
    const targetUser = users.find((u) => u.role === role);
    if (targetUser) {
      setCurrentUser(targetUser);
    }
  };

  const switchUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
    }
  };

  const addUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    const newUser: User = {
      ...userData,
      id: `u-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    setLocal('users', updatedUsers);
    await saveUser(newUser);
    return newUser;
  };

  const updateProfile = async (updated: Partial<User>): Promise<void> => {
    if (!currentUser) return;
    const modified: User = { ...currentUser, ...updated };
    setCurrentUserState(modified);
    const updatedList = users.map((u) => (u.id === modified.id ? modified : u));
    setUsers(updatedList);
    setLocal('users', updatedList);
    await saveUser(modified);
  };

  const logout = () => {
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isOnline,
        setCurrentUser,
        switchRole,
        switchUser,
        addUser,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
