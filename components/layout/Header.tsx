'use client';

import React from 'react';
import { NotificationBell } from './NotificationBell';

export function Header() {
  // Note: This will need to be refactored to use server components properly
  // For now, we'll fetch session data on the client side
  const [session, setSession] = React.useState<any>(null);

  React.useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => setSession(data))
      .catch(() => setSession(null));
  }, []);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-1">
            {/* Empty space for title/logo if needed */}
          </div>
          <div className="flex items-center space-x-4">
            <NotificationBell />
            {session && (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{session.name}</p>
                  <p className="text-xs text-gray-500">{session.roleName}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {session.name.charAt(0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

