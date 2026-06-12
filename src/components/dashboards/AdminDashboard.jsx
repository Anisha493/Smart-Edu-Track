import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, Users, BookOpen, CalendarCheck, TrendingUp, Megaphone } from 'lucide-react';
import { format } from 'date-fns';
import StatCard from '@/components/common/StatCard';
import PageHeader from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AdminDashboard() {
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => base44.entities.Class.list() });
  const { data: users = [] } = useQuery({ queryKey: ['allUsers'], queryFn: () => base44.entities.User.list() });
  const { data: attendance = [] } = useQuery({ queryKey: ['attendance'], queryFn: () => base44.entities.Attendance.list('-date', 500) });
  const { data: announcements = [] } = useQuery({ queryKey: ['announcements'], queryFn: () => base44.entities.Announcement.list('-created_date', 5) });

  const teachers = users.filter(u => u.role === 'teacher').length;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayAtt = attendance.filter(a => a.date === todayStr);
  const presentRate = todayAtt.length ? Math.round((todayAtt.filter(a => a.status === 'present').length / todayAtt.length) * 100) : 0;

  // last 7 days chart
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = format(d, 'yyyy-MM-dd');
    const dayRec = attendance.filter(a => a.date === ds);
    chartData.push({
      day: format(d, 'EEE'),
      present: dayRec.filter(a => a.status === 'present').length,
      absent: dayRec.filter(a => a.status === 'absent').length
    });
  }

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Real-time insights across your institution" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Students" value={students.length} icon={GraduationCap} accent="primary" />
        <StatCard label="Teachers" value={teachers} icon={Users} accent="accent" />
        <StatCard label="Classes" value={classes.length} icon={BookOpen} accent="primary" />
        <StatCard label="Today Attendance" value={`${presentRate}%`} icon={CalendarCheck} accent={presentRate >= 80 ? 'accent' : 'warn'} hint={`${todayAtt.length} records`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-lg">Weekly Attendance</h3>
              <p className="text-sm text-muted-foreground">Present vs absent — last 7 days</p>
            </div>
            <TrendingUp className="w-5 h-5 text-accent" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="present" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="absent" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-lg">Announcements</h3>
            <Megaphone className="w-5 h-5 text-accent" />
          </div>
          <div className="space-y-3">
            {announcements.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet</p>}
            {announcements.map(a => (
              <div key={a.id} className="p-3 rounded-lg border border-border/60 hover:bg-secondary/50 transition">
                <div className="font-medium text-sm">{a.title}</div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.body}</div>
                <div className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wider">{a.audience}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
