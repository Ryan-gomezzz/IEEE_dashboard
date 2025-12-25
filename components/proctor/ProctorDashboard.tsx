'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { useRouter } from 'next/navigation';

export function ProctorDashboard({ execoms, updates }: { execoms: any[]; updates: any[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [selectedExecom, setSelectedExecom] = useState('');
  const [updateText, setUpdateText] = useState('');
  const [loading, setLoading] = useState(false);

  // Get bi-weekly period (last 2 weeks)
  const today = new Date();
  const periodEnd = endOfWeek(today, { weekStartsOn: 1 });
  const periodStart = startOfWeek(subDays(periodEnd, 13), { weekStartsOn: 1 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExecom || !updateText.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/proctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          execom_id: selectedExecom,
          update_text: updateText,
          period_start: format(periodStart, 'yyyy-MM-dd'),
          period_end: format(periodEnd, 'yyyy-MM-dd'),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to submit update');
        return;
      }

      setShowForm(false);
      setSelectedExecom('');
      setUpdateText('');
      router.refresh();
    } catch (error) {
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const execomOptions = execoms.map(execom => ({
    value: execom.id,
    label: execom.name,
  }));

  // Group updates by execom
  const updatesByExecom = updates.reduce((acc, update) => {
    if (!acc[update.execom_id]) {
      acc[update.execom_id] = [];
    }
    acc[update.execom_id].push(update);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assigned Execoms ({execoms.length}/5)</CardTitle>
        </CardHeader>
        <CardContent>
          {execoms.length === 0 ? (
            <p className="text-gray-500">No execoms assigned</p>
          ) : (
            <div className="space-y-2">
              {execoms.map((execom) => (
                <div key={execom.id} className="p-3 border border-gray-200 rounded-lg">
                  <p className="font-medium">{execom.name}</p>
                  <p className="text-sm text-gray-500">{execom.email}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bi-Weekly Updates</CardTitle>
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              {showForm ? 'Cancel' : 'Add Update'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 space-y-4 p-4 bg-gray-50 rounded-lg">
              <Select
                label="Select Execom"
                options={execomOptions}
                value={selectedExecom}
                onChange={(e) => setSelectedExecom(e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Update (Period: {format(periodStart, 'MMM d')} - {format(periodEnd, 'MMM d')})
                </label>
                <textarea
                  required
                  rows={4}
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder="Enter bi-weekly update..."
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Update'}
              </Button>
            </form>
          )}

          <div className="space-y-6">
            {execoms.map((execom) => {
              const execomUpdates: any[] = updatesByExecom[execom.id] || [];
              return (
                <div key={execom.id} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                  <h3 className="font-semibold text-gray-900 mb-4">{execom.name}</h3>
                  {execomUpdates.length === 0 ? (
                    <p className="text-sm text-gray-500">No updates yet</p>
                  ) : (
                    <div className="space-y-4">
                      {execomUpdates.map((update: any) => (
                        <div key={update.id} className="pl-4 border-l-2 border-primary-500">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500">
                              {format(new Date(update.period_start), 'MMM d')} - {format(new Date(update.period_end), 'MMM d')}
                            </span>
                            <span className="text-xs text-gray-400">
                              {format(new Date(update.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{update.update_text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
