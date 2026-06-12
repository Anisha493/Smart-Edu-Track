import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { CalendarCheck, BarChart3, BookOpen, Bell, MessageSquare, TrendingUp } from 'lucide-react';
import StatCard from '@/components/common/StatCard';
import PageHeader from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { percent, gradeLetter } from '@/lib/roleUtils';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { format } from 'date-fns';

const STATUS_BADGE = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-amber-100 text-amber-700',
  excused: 'bg-blue-100 text-blue-700'
};

export default function StudentDashboard() {
  const { user } = useAuth();

  const { data: student } = useQuery({
    queryKey: ['student-dash', user?.email, user?.student_id_ref],
    queryFn: async () => {
      if (user.student_id_ref) {
        const r = await base44.entities.Student.filter({ id: user.student_id_ref });
        return r[0];
      }
      const r = await base44.entities.Student.filter({ email: user.email });
      return r[0];
    },
    enabled: !!user
  });

  const sid = student?.id;

  const { data: attendance = [] } = useQuery({
    queryKey: ['stu-att', sid],
    queryFn: () => base44.entities.Attendance.filter({ student_id: sid }, '-date', 60),
    enabled: !!sid
  });
  const { data: grades = [] } = useQuery({
    queryKey: ['stu-grades', sid],
    queryFn: () => base44.entities.Grade.filter({ student_id: sid }, '-date', 50),
    enabled: !!sid
  });
  const { data: announcements = [] } = useQuery({
    queryKey: ['stu-ann'],
    queryFn: () => base44.entities.Announcement.list('-created_date', 4)
  });
  const { data: notifications = [] } = useQuery({
    queryKey: ['stu-notifs', user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email, read: false }, '-created_date', 5),
    enabled: !!user?.email
  });
  const { data: calEvents = [] } = useQuery({
    queryKey: ['stu-cal'],
    queryFn: () => base44.entities.CalendarEvent.list('-date', 50)
  });

  const attRate = attendance.length ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100) : 0;
  const avg = grades.length ? Math.round(grades.reduce((s, g) => s + percent(g.score, g.max_score), 0) / grades.length) : 0;

  // Subject radar data
  const subjectMap = {};
  grades.forEach(g => {
    if (!g.subject_name) return;
    if (!subjectMap[g.subject_name]) subjectMap[g.subject_name] = [];
    subjectMap[g.subject_name].push(percent(g.score, g.max_score));
  });
  const radarData = Object.entries(subjectMap).map(([subject, scores]) => ({
    subject: subject.length > 10 ? subject.slice(0, 10) + '…' : subject,
    score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }));

  // Last 5 attendance records
  const recentAtt = attendance.slice(0, 5);

  // Upcoming calendar events
  const today = format(new Date(), 'yyyy-MM-dd');
  const upcoming = calEvents.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);

  return (
    <div>
      <PageHeader
        title={`Hello, ${user?.full_name?.split(' ')[0] || 'Student'} 👋`}
        subtitle="Your academic snapshot — stay on track!"
        actions={
          <Link to="/messages">
            <Button variant="outline" size="sm"><MessageSquare className="w-4 h-4 mr-2" />Message Teacher</Button>
          </Link>
        }
      />

      {!student && (
        <Card className="p-5 mb-6 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-900 font-medium">⚠️ Your student profile isn't linked yet. Ask an admin to connect your account to a student record.</p>
        </Card>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Attendance Rate" value={`${attRate}%`} icon={CalendarCheck} accent={attRate >= 80 ? 'accent' : 'warn'} hint={`${attendance.length} sessions`} />
        <StatCard label="Average Score" value={`${avg}%`} icon={BarChart3} accent="primary" hint={`Grade ${gradeLetter(avg)}`} />
        <StatCard label="Assessments" value={grades.length} icon={BookOpen} accent="accent" hint="this term" />
        <StatCard label="Notifications" value={notifications.length} icon={Bell} accent={notifications.length > 0 ? 'warn' : 'accent'} hint="unread" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        {/* Grade bar chart */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold">Recent Assessment Scores</h3>
            <Link to="/my-grades"><Button variant="ghost" size="sm">View all →</Button></Link>
          </div>
          {grades.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No grades recorded yet</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={grades.slice(0, 8).map(g => ({ name: (g.assessment_name || g.assessment_type).slice(0, 8), score: percent(g.score, g.max_score) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Score']} contentStyle={{ borderRadius: 8 }} />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Subject radar */}
        <Card className="p-5">
          <h3 className="font-display font-semibold mb-3">Performance by Subject</h3>
          {radarData.length < 3 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Need more subject data</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <Radar dataKey="score" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Recent attendance */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold">Recent Attendance</h3>
            <Link to="/my-attendance"><Button variant="ghost" size="sm">All →</Button></Link>
          </div>
          {recentAtt.length === 0 ? <p className="text-sm text-muted-foreground">No records</p> : (
            <div className="space-y-2">
              {recentAtt.map(a => (
                <div key={a.id} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{a.date}</span>
                  <Badge className={STATUS_BADGE[a.status]}>{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming events */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold">Upcoming Events</h3>
            <Link to="/calendar"><Button variant="ghost" size="sm">Calendar →</Button></Link>
          </div>
          {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming events</p> : (
            <div className="space-y-3">
              {upcoming.map(e => (
                <div key={e.id} className="flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-medium">{e.date?.slice(5, 7)}/{e.date?.slice(8, 10)}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{e.title}</div>
                    <div className="text-xs text-muted-foreground capitalize">{e.event_type?.replace('_', ' ')}{e.time ? ' · ' + e.time : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Announcements */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold">Announcements</h3>
            <Link to="/announcements"><Button variant="ghost" size="sm">All →</Button></Link>
          </div>
          {announcements.length === 0 ? <p className="text-sm text-muted-foreground">No announcements</p> : (
            <div className="space-y-2">
              {announcements.map(a => (
                <div key={a.id} className="p-3 rounded-lg bg-secondary/50 border border-border/40">
                  <div className="font-medium text-sm">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.body}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}