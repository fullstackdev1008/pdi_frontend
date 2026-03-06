import { Bell, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const roleLabels = {
  admin: 'Administrator',
  sales_admin: 'Sales Manager',
  workshop_supervisor: 'Workshop Supervisor',
  workshop_member: 'Workshop Member',
};

export default function Header({ title, subtitle }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 md:px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Title - push right on mobile to avoid menu button overlap */}
        <div className="ml-12 lg:ml-0">
          <h1 className="text-lg font-bold text-gray-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell size={18} className="text-gray-500" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full"></span>
          </button>

          {/* Settings */}
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Settings size={18} className="text-gray-500" />
          </button>

          {/* User */}
          <div className="flex items-center gap-2 md:gap-3 pl-2 border-l border-gray-100">
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.avatar_initials || user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold text-gray-800 leading-tight">{user?.name}</p>
              <p className="text-xs text-gray-500">{roleLabels[user?.role] || user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
