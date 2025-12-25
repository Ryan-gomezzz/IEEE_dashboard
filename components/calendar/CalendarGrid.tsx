'use client';

import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

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

interface CalendarGridProps {
  events: Event[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  technical: 'bg-blue-100 text-blue-800 border-blue-300',
  non_technical: 'bg-green-100 text-green-800 border-green-300',
  workshop: 'bg-purple-100 text-purple-800 border-purple-300',
  outreach: 'bg-orange-100 text-orange-800 border-orange-300',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarGrid({ events, currentDate, onDateChange }: CalendarGridProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.proposed_date);
      return isSameDay(eventDate, day);
    });
  };

  const handlePreviousMonth = () => {
    onDateChange(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    onDateChange(addMonths(currentDate, 1));
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePreviousMonth}
          className="p-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <h2 className="text-xl font-semibold text-gray-900">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextMonth}
          className="p-2"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAYS.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-gray-700 bg-gray-50"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, dayIdx) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);
          const isBlocked = dayEvents.length >= 2 || dayEvents.some(e => e.status === 'approved');

          return (
            <div
              key={day.toString()}
              className={`min-h-[100px] border-r border-b border-gray-200 p-1 ${
                !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
              } ${isBlocked ? 'bg-red-50' : ''}`}
            >
              <div className="flex flex-col h-full">
                <div
                  className={`text-sm font-medium mb-1 ${
                    !isCurrentMonth
                      ? 'text-gray-400'
                      : isCurrentDay
                      ? 'bg-primary-600 text-white rounded-full w-7 h-7 flex items-center justify-center'
                      : 'text-gray-900'
                  }`}
                >
                  {format(day, 'd')}
                </div>
                <div className="flex-1 space-y-0.5 overflow-y-auto">
                  {dayEvents.slice(0, 3).map((event) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className={`block text-xs px-1.5 py-0.5 rounded truncate border ${
                        EVENT_TYPE_COLORS[event.event_type] || 'bg-gray-100 text-gray-800 border-gray-300'
                      } hover:opacity-80 transition-opacity`}
                      title={`${event.title} - ${event.chapter?.name || 'Unknown'} (${event.event_type})`}
                    >
                      <span className="font-medium">{event.chapter?.code || 'N/A'}</span>
                      <span className="ml-1 opacity-90">{event.event_type}</span>
                    </Link>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 px-1.5">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



