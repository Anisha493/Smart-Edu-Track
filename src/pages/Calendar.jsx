import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Bell, Trash2, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PageHeader from '@/components/common/PageHeader';
import { toast } from 'sonner';
import { sendEmailSafe, createNotification } from '@/lib/roleUtils';

const TYPE_STYLES = {
  exam: 'bg-red-100 text-red-700 border-red-200',
  holiday: 'bg-green-100 text-green-700 border-green-200',
  parent_meeting: 'bg-purple-100 text-purple-700 border-purple-200',
  other: 'bg-blue-100 text-blue-700 border-blue-200'
};
const TYPE_DOT = {
  exam: 'bg-red-500',
  holiday: 'bg-green-500',
  parent_meeting: 'bg-purple-500',
  other: 'bg-blue-500'
};

export default function Calendar() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canEdit = user?.role === 'admin' || user?.role === 'teacher';
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', event_type: 'other', date: '', end_date: '', time: '', location: '', audience: 'all', class_id: '', send_reminder: false });

  const { data: events = [] } = useQuery({ queryKey: ['calendarEvents'], queryFn: () => base44.entities.CalendarEvent.list('-date', 500) });
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => base44.entities.Class.list() });
  const { data: allUsers = [] } = useQuery({ queryKey: ['allUsers'], queryFn: () => base44.entities.User.list(), enabled: canEdit });

  const del = useMutation({
    mutationFn: id => base44.entities.CalendarEvent.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['calendarEvents'] }); setSelected(null); toast.success('Event removed'); }
  });

  const save = async (e) => {
    e.preventDefault();
    if (!form.title || !form.date) { toast.error('Title and date are required'); return; }
    const created = await base44.entities.CalendarEvent.create({ ...form, created_by: user.email });

    if (form.send_reminder) {
      let recipients = [];
      if (form.audience === 'teachers') recipients = allUsers.filter(u => u.role === 'teacher').map(u => u.email);
      else if (form.audience === 'students') recipients = allUsers.filter(u => u.role === 'student').map(u => u.email);
      else if (form.audience === 'parents') recipients = allUsers.filter(u => u.role === 'parent').map(u => u.email);
      else recipients = allUsers.map(u => u.email);

      const subject = `📅 Upcoming: ${form.title} on ${form.date}`;
      const body = `<h3>${form.title}</h3><p><b>Date:</b> ${form.date}${form.time ? ' at ' + form.time : ''}</p>${form.location ? `<p><b>Location:</b> ${form.location}</p>` : ''}<p>${form.description || ''}</p><p>— EduTrack School Calendar</p>`;

      await Promise.all(recipients.filter(Boolean).map(async em => {
        await createNotification({ user_email: em, title: `📅 ${form.title}`, body: `${form.date}${form.time ? ' at ' + form.time : ''}`, type: 'info' });
        sendEmailSafe(em, subject, body);
      }));
      await base44.entities.CalendarEvent.update(created.id, { reminder_sent: true });
    }

    qc.invalidateQueries({ queryKey: ['calendarEvents'] });
    setOpen(false);
    toast.success('Event created' + (form.send_reminder ? ' & reminders sent' : ''));
  };

  // Calendar grid
  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsOnDay = (day) => events.filter(e => e.date && isSameDay(new Date(e.date), day));
  const selectedDayEvents = selected ? eventsOnDay(selected) : [];

  return (
    <div>
      <PageHeader
        title="School Calendar"
        subtitle="Exams, holidays, parent meetings and more"
        actions={canEdit && <Button onClick={() => { setForm({ ...form, date: selected ? format(selected, 'yyyy-MM-dd') : '' }); setOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Event</Button>}
      />

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Calendar grid */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-xl">{format(current, 'MMMM yyyy')}</h2>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => setCurrent(subMonths(current, 1))}><ChevronLeft className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => setCurrent(addMonths(current, 1))}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const dayEvents = eventsOnDay(day);
              const isToday = isSameDay(day, new Date());
              const isSelected = selected && isSameDay(day, selected);
              const inMonth = isSameMonth(day, current);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelected(day)}
                  className={`relative p-1 min-h-[56px] rounded-lg text-left text-sm transition ${isSelected ? 'bg-primary text-primary-foreground' : isToday ? 'bg-primary/10 font-bold' : inMonth ? 'hover:bg-secondary' : 'opacity-30 hover:bg-secondary'}`}
                >
                  <span className="block text-xs ml-1 mb-1">{format(day, 'd')}</span>
                  <div className="flex flex-wrap gap-0.5">
                    {dayEvents.slice(0, 3).map((e, i) => (
                      <span key={i} className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : TYPE_DOT[e.event_type]}`} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 flex-wrap">
            {Object.entries(TYPE_DOT).map(([type, dot]) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                {type.replace('_', ' ')}
              </div>
            ))}
          </div>
        </Card>

        {/* Selected day panel */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-display font-semibold mb-3">
              {selected ? format(selected, 'EEEE, MMM d') : 'Select a day'}
            </h3>
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{selected ? 'No events this day' : 'Click a date to see events'}</p>
            ) : (
              <div className="space-y-3">
                {selectedDayEvents.map(e => (
                  <div key={e.id} className={`p-3 rounded-lg border text-sm ${TYPE_STYLES[e.event_type]}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{e.title}</div>
                        {e.time && <div className="text-xs mt-0.5">🕐 {e.time}</div>}
                        {e.location && <div className="text-xs mt-0.5">📍 {e.location}</div>}
                        {e.description && <div className="mt-1 text-xs opacity-80">{e.description}</div>}
                        <Badge className={`mt-2 ${TYPE_STYLES[e.event_type]}`}>{e.event_type.replace('_', ' ')}</Badge>
                      </div>
                      {canEdit && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del.mutate(e.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Upcoming events */}
          <Card className="p-5">
            <h3 className="font-display font-semibold mb-3">Upcoming</h3>
            <div className="space-y-2">
              {events
                .filter(e => e.date >= format(new Date(), 'yyyy-MM-dd'))
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 5)
                .map(e => (
                  <div key={e.id} className="flex gap-3 items-start">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${TYPE_DOT[e.event_type]}`} />
                    <div>
                      <div className="text-sm font-medium">{e.title}</div>
                      <div className="text-xs text-muted-foreground">{e.date}{e.time ? ' · ' + e.time : ''}</div>
                    </div>
                  </div>
                ))}
              {events.filter(e => e.date >= format(new Date(), 'yyyy-MM-dd')).length === 0 && (
                <p className="text-sm text-muted-foreground">No upcoming events</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Add Event dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New Calendar Event</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.event_type} onValueChange={v => setForm({ ...form, event_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                    <SelectItem value="parent_meeting">Parent Meeting</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Audience</Label>
                <Select value={form.audience} onValueChange={v => setForm({ ...form, audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="teachers">Teachers</SelectItem>
                    <SelectItem value="students">Students</SelectItem>
                    <SelectItem value="parents">Parents</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Time</Label><Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.send_reminder} onCheckedChange={v => setForm({ ...form, send_reminder: v })} />
              <Label className="flex items-center gap-1"><Bell className="w-3.5 h-3.5" />Send email reminder to audience</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Create Event</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}