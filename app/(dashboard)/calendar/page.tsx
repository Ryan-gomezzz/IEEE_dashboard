'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface Event {
  id: string;
  title: string;
  event_type: string;
  proposed_date: string;
  chapter?: {
    name: string;
    code: string;
  };
  status: string;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
        
        const response = await fetch(`/api/calendar?start=${start}&end=${end}`);
        const data = await response.json();
        
        if (response.ok) {
          setEvents(data.events || []);
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [currentDate]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Unified Calendar" subtitle="View all events across all chapters" />
        <Card>
          <CardContent>
            <div className="text-center py-8 text-gray-500">Loading calendar...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Unified Calendar" subtitle="View all events across all chapters" />
      
      {/* View Switcher */}
      <div className="mb-4 flex gap-2">
        <Button
          variant={view === 'month' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setView('month')}
        >
          Month
        </Button>
        <Button
          variant={view === 'week' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setView('week')}
          disabled
          title="Week view coming soon"
        >
          Week
        </Button>
        <Button
          variant={view === 'day' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setView('day')}
          disabled
          title="Day view coming soon"
        >
          Day
        </Button>
      </div>

      {/* Calendar Grid */}
      {view === 'month' && (
        <CalendarGrid
          events={events}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
        />
      )}

      {/* Legend */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Event Type Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span className="text-sm text-gray-700">Technical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-sm text-gray-700">Non-Technical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
            <span className="text-sm text-gray-700">Workshop</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
            <span className="text-sm text-gray-700">Outreach</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
            <span className="text-sm text-gray-700">Blocked Date (2+ events or approved event)</span>
          </div>
        </div>
      </div>
    </div>
  );
}