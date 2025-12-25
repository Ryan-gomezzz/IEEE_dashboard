'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Calendar, FileText, CheckSquare, Users, File, Settings, LogOut } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Events', href: '/events', icon: FileText },
  { name: 'Approvals', href: '/approvals', icon: CheckSquare },
  { name: 'Assignments', href: '/assignments', icon: Users },
  { name: 'Documents', href: '/documents', icon: File },
  { name: 'Proctor', href: '/proctor', icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white">
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold text-primary-700">IEEE RIT-B</h1>
        </div>
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  isActive
                    ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors`}
              >
                <item.icon
                  className={`${
                    isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                  } mr-3 flex-shrink-0 h-5 w-5`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <button
            onClick={handleLogout}
            className="flex-shrink-0 w-full group block"
          >
            <div className="flex items-center text-gray-600 hover:text-gray-900">
              <LogOut className="h-5 w-5 text-gray-400 group-hover:text-gray-500 mr-3" />
              <span className="text-sm font-medium">Logout</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
