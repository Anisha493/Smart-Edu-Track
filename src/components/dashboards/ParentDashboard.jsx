import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { format, subDays } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/common/StatCard';
import PageHeader from '@/components/common/PageHeader';
import { CalendarCheck, BarChart3, BookOpen, MessageSquare } from 'lucide-react';
import { percent, gradeLetter } from '@/lib/roleUtils';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NOTE_COLORS = { positive: 'bg-green-100 text-green-700 border-green-200', concern: 'bg-red-100 text-red-700 border-red-200', neutral: 'bg-slate-100 text-slate-600 border-slate-200' };
const ATT_PIE_COLORS = ['#1a8c9e', '#e85d5d', '#f5a623', '#5b9bd5'];

export default function ParentDashboard() {
  const { user } = useAuth();

  const { data: student } = useQuery({
    queryKey: ['parentStudent', user?.email, user?.student_id_ref],
    queryFn: async () => {
      if (user.student_id_ref) {
        const list = await base44.entities.Student.filter({ id: user.student_id_ref });
        return list[0];
      }
      const list = await base44.entities.Student.filter({ parent_email: user.email });
      return list[0];
    },
    enabled: !!user
  });

  const sid = student?.id;

  const { data: attendance = [] } = useQuery({
    queryKey: ['parentAtt', sid],
    queryFn: () => base44.entities.Attendance.filter({ student_id: sid }, '-date', 90),
    enabled: !!sid
  });
  const { data: grades = [] } = useQuery({
    queryKey: ['parentGrades', sid],
    queryFn: () => base44.entities.Grade.filter({ student_id: sid }, '-date', 30),
    enabled: !!sid
  });
  const { data: notes = [] } = useQuery({
    queryKey: ['parentNotes', sid],
    queryFn: () => base44.entities.BehaviorNote.filter({ student_id: sid }, '-date', 10),
    enabled: !!sid
  });
  const { data: announcements = [] } = useQuery({
    queryKey: ['announcementsParent'],
    queryFn: () => base44.entities.Announcement.list('-created_date', 4)
  });

  // Attendance trend — last 30 days bucketed by week
  const weeklyAttendance = [];
  for (let w = 3; w >= 0; w--) {
    const start = subDays(new Date(), (w + 1) * 7);
    const end = subDays(new Date(), w * 7);
    const week = attendance.filter(a => {
      const d = new Date(a.date);
      return d >= start && d < end;
    });
    weeklyAttendance.push({
      week: `Wk ${4 - w}`,
      present: week.filter(a => a.status === 'present').length,
      absent: week.filter(a => a.status === 'absent').length,
      late: week.filter(a => a.status === 'late').length
    });
  }

  // Pie chart data
  const attCounts = {
    Present: attendance.filter(a => a.status === 'present').length,
    Absent: attendance.filter(a => a.status === 'absent').length,
    Late: attendance.filter(a => a.status === 'late').length,
    Excused: attendance.filter(a => a.status === 'excused').length
  };
  const pieData = Object.entries(attCounts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

  const avgScore = grades.length ? Math.round(grades.reduce((s, g) => s + percent(g.score, g.max_score), 0) / grades.length) : 0;
  const attRate = attendance.length ? Math.round((attCounts.Present / attendance.length) * 100) : 0;

  if (!student) {
    return (
      <div>
        <PageHeader title="Parent Dashboard" subtitle="Monitoring your child's academic journey" />
        <Card className="p-8 text-center max-w-lg mx-auto">
          <div className="text-4xl mb-4">🔗</div>
          <h3 className="font-display font-semibold text-lg mb-2">No child linked yet</h3>
          <p className="text-muted-foreground text-sm">Ask your school admin to link your account to your child's student record in the Users section.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${student.full_name}'s Progress`}
        subtitle={`Parent dashboard — ${format(new Date(), 'MMMM yyyy')}`}
        actions={
          <Link to="/messages">
            <Button variant="outline" size="sm"><MessageSquare className="w-4 h-4 mr-2" />Message Teacher</Button>
          </Link>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Attendance Rate" value={`${attRate}%`} icon={CalendarCheck} accent={attRate >= 80 ? 'accent' : 'warn'} hint={`${attendance.length} days tracked`} />
        <StatCard label="Avg. Score" value={`${avgScore}%`} icon={BarChart3} accent="primary" hint={`Grade ${gradeLetter(avgScore)}`} />
        <StatCard label="Assessments" value={grades.length} icon={BookOpen} hint="this term" />
        <StatCard label="Behavior Notes" value={notes.length} icon={CalendarCheck} accent={notes.some(n => n.type === 'concern') ? 'warn' : 'accent'} hint="recent" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        {/* Attendance trend */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-display font-semibold mb-1">Attendance Trend</h3>
          <p className="text-xs text-muted-foreground mb-4">Weekly breakdown — last 4 weeks</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyAttendance}>
                <defs>
                  <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a8c9e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1a8c9e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                <Area type="monotone" dataKey="present" stroke="#1a8c9e" fill="url(#gPresent)" strokeWidth={2} name="Present" />
                <Area type="monotone" dataKey="absent" stroke="#e85d5d" fill="none" strokeWidth={2} strokeDasharray="4 2" name="Absent" />
                <Area type="monotone" dataKey="late" stroke="#f5a623" fill="none" strokeWidth={2} strokeDasharray="4 2" name="Late" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Attendance pie */}
        <Card className="p-5">
          <h3 className="font-display font-semibold mb-1">Attendance Breakdown</h3>
          <p className="text-xs text-muted-foreground mb-2">All time</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={ATT_PIE_COLORS[i % ATT_PIE_COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={10} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent Grades */}
        <Card className="p-5">
          <h3 className="font-display font-semibold mb-4">Recent Grades</h3>
          {grades.length === 0 ? <p className="text-sm text-muted-foreground">No grades posted yet</p> : (
            <div className="space-y-2">
              {grades.slice(0, 6).map(g => {
                const p = percent(g.score, g.max_score);
                const barColor = p >= 80 ? 'bg-green-500' : p >= 60 ? 'bg-amber-400' : 'bg-red-400';
                return (
                  <div key={g.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium truncate max-w-[60%]">{g.assessment_name || g.assessment_type} <span className="text-muted-foreground font-normal">· {g.subject_name}</span></span>
                      <span className="font-mono font-semibold">{g.score}/{g.max_score} <span className="text-xs text-accent">({gradeLetter(p)})</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${p}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Behavior Notes + Announcements */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-display font-semibold mb-3">Behavioral Notes</h3>
            {notes.length === 0 ? <p className="text-sm text-muted-foreground">No notes recorded</p> : (
              <div className="space-y-2">
                {notes.slice(0, 4).map(n => (
                  <div key={n.id} className={`p-3 rounded-lg border text-sm ${NOTE_COLORS[n.type]}`}>
                    <div className="flex justify-between mb-1">
                      <Badge className={NOTE_COLORS[n.type]}>{n.type}</Badge>
                      <span className="text-xs opacity-70">{n.date}</span>
                    </div>
                    {n.note}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-display font-semibold mb-3">School Announcements</h3>
            {announcements.map(a => (
              <div key={a.id} className="p-3 rounded-lg border border-border/60 mb-2">
                <div className="font-medium text-sm">{a.title}</div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.body}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}