import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Wallet, Bell, User } from 'lucide-react';

export default function AppShell({ children }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { icon: Home, label: 'Trang chủ', path: '/' },
    { icon: Users, label: 'Spaces', path: '/spaces/new' }, // Just an example link for now
    { icon: Wallet, label: 'Đóng góp', path: '/contributions' },
    { icon: User, label: 'Cá nhân', path: '/profile' }, // Or somewhere
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto relative shadow-xl overflow-hidden">
      {/* Header */}
      <header className="bg-emerald-600 text-white p-4 flex justify-between items-center z-10 shadow-md">
        <h1 className="text-xl font-bold">MicroBatch 🍜</h1>
        <Link to="/notifications" className="relative p-2">
          <Bell className="w-6 h-6" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-emerald-600"></span>
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="p-4">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 w-full bg-white border-t border-gray-200 flex justify-around p-2 z-10 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
          return (
            <Link 
              key={item.label} 
              to={item.path} 
              className={`flex flex-col items-center p-2 min-w-[64px] ${isActive ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
