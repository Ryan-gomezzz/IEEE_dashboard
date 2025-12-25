'use client';

import { useState, useEffect } from 'react';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useRouter } from 'next/navigation';

const TEAM_TYPES = [
  { value: 'documentation', label: 'Documentation' },
  { value: 'pr', label: 'PR' },
  { value: 'design', label: 'Design' },
  { value: 'coverage', label: 'Coverage' },
];

export function AssignmentList({ events, assignments }: { events: any[]; assignments: any[] }) {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/users?execom=true')
      .then(res => res.json())
      .then(data => setUsers(data.users || []))
      .catch(() => setUsers([]));
  }, []);

  const handleAssign = async (eventId: string, teamType: string, userId: string) => {
    const key = `${eventId}-${teamType}`;
    setLoading({ ...loading, [key]: true });

    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          team_type: teamType,
          assigned_to: userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to assign member');
        return;
      }

      router.refresh();
    } catch (error) {
      alert('An error occurred');
    } finally {
      setLoading({ ...loading, [key]: false });
    }
  };

  const getAssignment = (eventId: string, teamType: string) => {
    return assignments.find(a => a.event_id === eventId && a.team_type === teamType);
  };

  if (events.length === 0) {
    return <div className="text-center py-8 text-gray-500">No approved events requiring assignments</div>;
  }

  return (
    <div className="space-y-6">
      {events.map((event) => (
        <div key={event.id} className="border border-gray-200 rounded-lg p-4">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900">{event.title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {event.chapter?.name} • {new Date(event.proposed_date).toLocaleDateString()}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEAM_TYPES.map((teamType) => {
              const assignment = getAssignment(event.id, teamType.value);
              const key = `${event.id}-${teamType.value}`;

              return (
                <div key={teamType.value} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {teamType.label} Team
                  </label>
                  {assignment ? (
                    <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                      <span className="text-sm text-green-800">
                        Assigned to: {assignment.assigned_to_user?.name}
                      </span>
                      <Badge variant="success">Assigned</Badge>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssign(event.id, teamType.value, e.target.value);
                          }
                        }}
                        disabled={loading[key]}
                      >
                        <option value="">Select execom...</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
