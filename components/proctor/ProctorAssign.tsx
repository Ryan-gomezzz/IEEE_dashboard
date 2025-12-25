'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role?: { level: number; name: string };
  chapter_id?: string | null;
};

type MappingRow = {
  proctor_id: string;
  execom_id: string;
  proctor?: { id: string; name: string; email: string };
  execom?: { id: string; name: string; email: string };
};

export function ProctorAssign({ users, mappings }: { users: UserRow[]; mappings: MappingRow[] }) {
  const [proctorId, setProctorId] = useState('');
  const [execomId, setExecomId] = useState('');
  const [loading, setLoading] = useState(false);

  const execomUsers = useMemo(
    () => users.filter(u => u.role?.level === 5),
    [users]
  );

  const proctorCandidates = useMemo(
    () => users.filter(u => u.role?.level === 5 || u.role?.level === 4 || u.role?.level === 3 || u.role?.level === 2 || u.role?.level === 1),
    [users]
  );

  const menteesForProctor = useMemo(() => {
    const byProctor: Record<string, MappingRow[]> = {};
    for (const m of mappings) {
      byProctor[m.proctor_id] = byProctor[m.proctor_id] || [];
      byProctor[m.proctor_id].push(m);
    }
    return byProctor;
  }, [mappings]);

  const handleAssign = async () => {
    if (!proctorId || !execomId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/proctor/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proctor_id: proctorId, execom_id: execomId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to assign');
        return;
      }
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (pId: string, eId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/proctor/mappings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proctor_id: pId, execom_id: eId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to remove');
        return;
      }
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Proctor</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            value={proctorId}
            onChange={(e) => setProctorId(e.target.value)}
          >
            <option value="">Select proctor...</option>
            {proctorCandidates.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role?.name})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Execom (Mentee)</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
            value={execomId}
            onChange={(e) => setExecomId(e.target.value)}
          >
            <option value="">Select execom...</option>
            {execomUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <Button onClick={handleAssign} disabled={loading || !proctorId || !execomId}>
            {loading ? 'Saving...' : 'Assign'}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(menteesForProctor).length === 0 ? (
          <div className="text-center py-8 text-gray-500">No proctor mappings yet</div>
        ) : (
          Object.entries(menteesForProctor).map(([pId, list]) => (
            <div key={pId} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-900">
                    Proctor: {list[0]?.proctor?.name || pId}
                  </div>
                  <div className="text-sm text-gray-500">
                    {list.length}/5 mentees
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {list.map((m) => (
                  <div key={`${m.proctor_id}-${m.execom_id}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{m.execom?.name || m.execom_id}</div>
                      <div className="text-xs text-gray-500">{m.execom?.email}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={() => handleRemove(m.proctor_id, m.execom_id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}




