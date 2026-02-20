import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, parseISO } from 'date-fns';
import { getCalendarEvents, getCustomEvents, createCustomEvent, updateCustomEvent, deleteCustomEvent, CalendarEvent as FrontendCalendarEvent } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';

// Helper to get ISO date string from Date
const toISODate = (date: Date) => date.toISOString().split('T')[0];

// Calendar page component
export default function Calendar() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const monthRange = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Compute offset for first day of month (Mon=0)
  const startDayOfWeek = getDay(monthStart); // 0=Sun,1=Mon,...6=Sat
  const offset = (startDayOfWeek + 6) % 7; // convert to Mon-first
  const blanks = Array(offset).fill(null);
  const days = [...blanks, ...monthRange];

  // Fetch calendar events for the month (with buffer weeks)
  const prevMonth = subMonths(monthStart, 1);
  const nextMonth = addMonths(monthEnd, 1);
  const startFetch = toISODate(prevMonth);
  const endFetch = toISODate(nextMonth);

  const { data: calendarData, refetch: refetchCalendar } = useQuery({
    queryKey: ['calendarEvents', startFetch, endFetch],
    queryFn: () => getCalendarEvents(startFetch, endFetch),
    staleTime: 5 * 60 * 1000,
  });

  const { data: customEventsData, refetch: refetchCustom } = useQuery({
    queryKey: ['customEvents'],
    queryFn: () => getCustomEvents(),
    staleTime: 5 * 60 * 1000,
  });

  const events = useMemo(() => calendarData?.events || [], [calendarData]);
  const customEvents = useMemo(() => customEventsData || [], [customEventsData]);

  // Get events for a particular day
  const getDayEvents = (dateStr: string) => {
    const dayEvents = events.filter(e => e.date === dateStr);
    // Include custom events as well (they also appear in calendar events, but we can show edit/delete only for custom)
    return dayEvents;
  };

  // Get custom events for selected date (for editing)
  const getSelectedCustomEvents = () => {
    if (!selectedDate) return [];
    return customEvents.filter(e => e.date === selectedDate);
  };

  // Handle adding custom event
  const handleAddCustomEvent = async () => {
    if (!selectedDate || !newEventTitle.trim()) {
      toast.error('Please select a date and enter a title');
      return;
    }
    try {
      await createCustomEvent({
        date: selectedDate,
        title: newEventTitle,
        description: newEventDesc.trim() || undefined,
      });
      toast.success('Custom event added');
      setNewEventTitle('');
      setNewEventDesc('');
      refetchCalendar();
      refetchCustom();
    } catch (e: any) {
      toast.error('Failed to add event: ' + e.message);
    }
  };

  // Handle edit/delete
  const handleUpdateCustomEvent = async (id: number, updates: { title?: string; description?: string }) => {
    try {
      await updateCustomEvent(id, updates);
      toast.success('Event updated');
      setEditingEventId(null);
      refetchCalendar();
      refetchCustom();
    } catch (e: any) {
      toast.error('Failed to update: ' + e.message);
    }
  };

  const handleDeleteCustomEvent = async (id: number) => {
    if (!confirm('Delete this custom event?')) return;
    try {
      await deleteCustomEvent(id);
      toast.success('Event deleted');
      refetchCalendar();
      refetchCustom();
    } catch (e: any) {
      toast.error('Failed to delete: ' + e.message);
    }
  };

  // Color code for event types
  const typeColors: Record<string, string> = {
    run: 'bg-green-500',
    parkrun: 'bg-amber-500',
    recommendation: 'bg-blue-500',
    custom: 'bg-purple-500',
  };

  // Helpers to generate month/weekday headers
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekDaysShort = weekDays;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Training Calendar</h1>
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => setViewDate(prev => subMonths(prev, 1))}>&larr; Prev</Button>
          <span className="text-lg font-medium w-40 text-center">
            {format(viewDate, 'MMMM yyyy')}
          </span>
          <Button variant="outline" onClick={() => setViewDate(prev => addMonths(prev, 1))}>Next &rarr;</Button>
        </div>
      </div>

      {/* Event creation form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Custom Event{selectedDate ? ` for ${selectedDate}` : ''}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="eventDate">Date</Label>
            <Input
              id="eventDate"
              type="date"
              value={selectedDate || ''}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="eventTitle">Title</Label>
            <Input
              id="eventTitle"
              placeholder="Event title"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="eventDesc">Description (optional)</Label>
            <Input
              id="eventDesc"
              placeholder="Description"
              value={newEventDesc}
              onChange={(e) => setNewEventDesc(e.target.value)}
            />
          </div>
          <Button onClick={handleAddCustomEvent}>Add Event</Button>
        </CardContent>
      </Card>

      {/* Calendar grid */}
      <div className="border rounded-lg bg-card">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b">
          {weekDaysShort.map(day => (
            <div key={day} className="p-2 text-center font-semibold bg-muted/50">
              {day}
            </div>
          ))}
        </div>
        {/* Days grid */}
        <div className="grid grid-cols-7 auto-rows-fr">
          {days.map((day, idx) => {
            if (!day) {
              return (
                <div key={`blank-${idx}`} className="min-h-32 border-r border-b p-2 bg-muted/20" />
              );
            }
            const dateStr = toISODate(day);
            const dayEvents = getDayEvents(dateStr);
            const isSelected = selectedDate === dateStr;
            const isToday = toISODate(today) === dateStr;

            return (
              <div
                key={dateStr}
                className={`min-h-32 border-r border-b p-2 cursor-pointer hover:bg-muted/50 ${isSelected ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedDate(dateStr)}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-sm font-bold ${isToday ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-1 overflow-y-auto max-h-[100px]">
                  {dayEvents.slice(0, 3).map((ev, i) => (
                    <div
                      key={i}
                      className={`text-xs px-1 py-0.5 rounded text-white truncate ${typeColors[ev.type] || 'bg-gray-500'}`}
                      title={`${ev.title}${ev.distance_km ? ` - ${ev.distance_km.toFixed(1)}km` : ''}`}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day events and custom event editing */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>Events on {selectedDate}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                const dayEvents = events.filter(e => e.date === selectedDate);
                const dayCustom = customEvents.filter(e => e.date === selectedDate);
                if (dayEvents.length === 0 && dayCustom.length === 0) {
                  return <p className="text-muted-foreground">No events for this day.</p>;
                }
                return (
                  <ul className="space-y-2">
                    {dayEvents.map(ev => (
                      <li key={ev.id} className="flex items-start justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            <Badge className={`${typeColors[ev.type] || 'bg-gray-500'}`}>{ev.type}</Badge>
                            {ev.title}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {ev.distance_km ? `${ev.distance_km.toFixed(1)} km` : ''}
                            {ev.duration_minutes ? ` • ${Math.round(ev.duration_minutes)} min` : ''}
                            {ev.notes ? ` • ${ev.notes}` : ''}
                          </div>
                        </div>
                      </li>
                    ))}
                    {dayCustom.map(ev => (
                      <li key={ev.id} className="flex items-start justify-between p-2 border rounded bg-purple-50 dark:bg-purple-950/20">
                        <div className="flex-1">
                          <div className="font-medium flex items-center gap-2">
                            <Badge variant="outline" className="border-purple-500 text-purple-600">custom</Badge>
                            {editingEventId === ev.id ? (
                              <>
                                <Input
                                  value={ev.title}
                                  onChange={(e) => setNewEventTitle(e.target.value)}
                                  className="h-6 inline w-40"
                                />
                                <Input
                                  value={ev.description || ''}
                                  onChange={(e) => setNewEventDesc(e.target.value)}
                                  placeholder="Description"
                                  className="h-6 inline w-48"
                                />
                                <Button size="sm" onClick={() => handleUpdateCustomEvent(ev.id, { title: newEventTitle, description: newEventDesc })}>Save</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingEventId(null)}>Cancel</Button>
                              </>
                            ) : (
                              <>
                                <span>{ev.title}</span>
                                {ev.description && <span className="text-sm text-muted-foreground"> - {ev.description}</span>}
                              </>
                            )
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setEditingEventId(ev.id); setNewEventTitle(ev.title); setNewEventDesc(ev.description || ''); setSelectedDate(ev.date); }}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteCustomEvent(ev.id)}>Delete</Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
