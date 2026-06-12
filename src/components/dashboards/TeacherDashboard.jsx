import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { GraduationCap, CalendarCheck, BookOpen, BarChart3, Plus, Megaphone, FileText, CalendarDays } from 'lucide-react';
import StatCard from '@/components/common/StatCard';
import PageHeader from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { percent, gradeLetter, createNotification } from '@/lib/roleUtils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

const ATT_COLORS = { present: 'bg-green-100 text-green-700', absent: 'bg-red-100 text-red-700', late: 'bg-amber-100 text-amber-700', excused: 'bg-blue-100 text-blue-700' };

export default function TeacherDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [quickAttClass, setQuickAttClass] = useState('');
  const [quickAttOpen, setQuickAttOpen] = useState(false);
  const [quickMarks, setQuickMarks] = useState({});
  const [gradeOpen, setGradeOpen] = useState(false);
  const [gradeForm, setGradeForm] = useState({ student_id: '', assessment_name: '', score: '', max_score: 100, assessment_type: 'assignment', subject_name: '' });
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({ student_id: '', note: '', type: 'neutral', date: format(new Date(), 'yyyy-MM-dd') });

  const { data: myClasses = [] } = useQuery({ queryKey: ['tch-classes', user?.email], queryFn: () => base44.entities.Class.filter({ teacher_email: user.email }), enabled: !!user?.email });
  const { data: mySubjects = [] } = useQuery({ queryKey: ['tch-subjects', user?.email], queryFn: () => base44.entities.Subject.filter({ teacher_email: user.email }), enabled: !!user?.email });
  const { data: allStudents = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const { data: recentGrades = [] } = useQuery({ queryKey: ['tch-grades', user?.email], queryFn: () => base44.entities.Grade.filter({ graded_by: user.email }, '-date', 20), enabled: !!user?.email });
  const { data: todayAtt = [] } = useQuery({
    queryKey: ['tch-att-today'],
    queryFn: () => base44.entities.Attendance.filter({ marked_by: user.email, date: format(new Date(), 'yyyy-MM-dd') })
  });
  const { data: classStudents = [] } = useQuery({
    queryKey: ['tch-classStu', quickAttClass],
    queryFn: () => base44.entities.Student.filter({ class_id: quickAttClass }),
    enabled: !!quickAttClass
  });

  const myClassIds = myClasses.map(c => c.id);
  const myStudents = allStudents.filter(s => myClassIds.includes(s.class_id));

  // Grade class performance chart
  const classPerf = myClasses.map(c => {
    const stuIds = allStudents.filter(s => s.class_id === c.id).map(s => s.id);
    const classGrades = recentGrades.filter(g => stuIds.includes(g.student_id));
    const avg = classGrades.length ? Math.round(classGrades.reduce((s, g) => s + percent(g.score, g.max_score), 0) / classGrades.length) : 0;
    return { name: c.name?.split(' ').slice(-2).join(' '), avg };
  });

  const saveQuickAtt = async () => {
    const date = format(new Date(), 'yyyy-MM-dd');
    await Promise.all(classStudents.map(s => {
      const status = quickMarks[s.id] || 'present';
      return base44.entities.Attendance.create({ student_id: s.id, class_id: quickAttClass, date, status, marked_by: user.email });
    }));
    qc.invalidateQueries({ queryKey: ['tch-att-today'] });
    setQuickAttOpen(false);
    toast.success(`Attendance marked for ${classStudents.length} students`);
  };

  const saveGrade = async (e) => {
    e.preventDefault();
    if (!gradeForm.student_id || gradeForm.score === '') { toast.error('Student and score required'); return; }
    const pct = percent(Number(gradeForm.score), Number(gradeForm.max_score));
    await base44.entities.Grade.create({ ...gradeForm, score: Number(gradeForm.score), max_score: Number(gradeForm.max_score), grade_letter: gradeLetter(pct), graded_by: user.email, date: format(new Date(), 'yyyy-MM-dd') });
    const student = allStudents.find(s => s.id === gradeForm.student_id);
    if (student?.email) {
      await createNotification({ user_email: student.email, title: `New grade: ${gradeForm.assessment_name || gradeForm.assessment_type}`, body: `${gradeForm.score}/${gradeForm.max_score} (${pct}% · ${gradeLetter(pct)})`, type: 'grade' });
    }
    qc.invalidateQueries({ queryKey: ['tch-grades'] });
    setGradeOpen(false);
    toast.success('Grade saved & student notified');
  };

  const saveNote = async (e) => {
    e.preventDefault();
    if (!noteForm.student_id || !noteForm.note) { toast.error('Student and note required'); return; }
    await base44.entities.BehaviorNote.create({ ...noteForm, recorded_by: user.email });
    const student = allStudents.find(s => s.id === noteForm.student_id);
    if (student?.parent_email) {
      await createNotification({ user_email: student.parent_email, title: `Behavioral note for ${student.full_name}`, body: noteForm.note, type: noteForm.type === 'concern' ? 'alert' : 'info' });
    }
    setNoteOpen(false);
    toast.success('Note saved' + (student?.parent_email ? ' & parent notified' : ''));
  };

  return (
    <div>
      <PageHeader title={`Good day, ${user?.full_name?.split(' ')[0] || 'Teacher'} 👋`} subtitle="Manage your classes and track student progress" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="My Classes" value={myClasses.length} icon={BookOpen} />
        <StatCard label="My Students" value={myStudents.length} icon={GraduationCap} accent="accent" />
        <StatCard label="My Subjects" value={mySubjects.length} icon={BarChart3} />
        <StatCard label="Today Marked" value={todayAtt.length} icon={CalendarCheck} accent={todayAtt.length > 0 ? 'accent' : 'warn'} hint="attendance records" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Button variant="outline" className="h-16 flex-col gap-1 text-xs" onClick={() => setQuickAttOpen(true)}>
          <CalendarCheck className="w-5 h-5 text-primary" />Mark Attendance
        </Button>
        <Button variant="outline" className="h-16 flex-col gap-1 text-xs" onClick={() => setGradeOpen(true)}>
          <BarChart3 className="w-5 h-5 text-accent" />Enter Grade
        </Button>
        <Button variant="outline" className="h-16 flex-col gap-1 text-xs" onClick={() => setNoteOpen(true)}>
          <FileText className="w-5 h-5 text-amber-500" />Behavior Note
        </Button>
        <Link to="/report-cards" className="contents">
          <Button variant="outline" className="h-16 flex-col gap-1 text-xs w-full">
            <Megaphone className="w-5 h-5 text-purple-500" />Report Cards
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        {/* Class performance */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold">Class Average Scores</h3>
            <Link to="/grades"><Button variant="ghost" size="sm">All grades →</Button></Link>
          </div>
          {classPerf.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No class data yet</p> : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classPerf}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={v => [`${v}%`, 'Avg']} contentStyle={{ borderRadius: 8 }} />
                  <Bar dataKey="avg" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* My classes list */}
        <Card className="p-5">
          <h3 className="font-display font-semibold mb-3">My Classes</h3>
          <div className="space-y-2">
            {myClasses.length === 0 && <p className="text-sm text-muted-foreground">No classes assigned yet</p>}
            {myClasses.map(c => (
              <div key={c.id} className="p-3 rounded-lg border border-border/60">
                <div className="font-medium text-sm">{c.name}</div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">Room {c.room || '—'}</span>
                  <span className="text-xs font-medium text-accent">{allStudents.filter(s => s.class_id === c.id).length} students</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent grades */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold">Recently Posted Grades</h3>
          <Link to="/grades"><Button variant="ghost" size="sm">Manage →</Button></Link>
        </div>
        {recentGrades.length === 0 ? <p className="text-sm text-muted-foreground">No grades posted yet</p> : (
          <div className="grid md:grid-cols-2 gap-2">
            {recentGrades.slice(0, 8).map(g => {
              const p = percent(g.score, g.max_score);
              const stu = allStudents.find(s => s.id === g.student_id);
              return (
                <div key={g.id} className="flex justify-between items-center p-3 rounded-lg border border-border/60 text-sm">
                  <div>
                    <div className="font-medium">{stu?.full_name || '—'}</div>
                    <div className="text-xs text-muted-foreground">{g.assessment_name || g.assessment_type} · {g.subject_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold">{g.score}/{g.max_score}</div>
                    <div className="text-xs text-accent">{g.grade_letter || gradeLetter(p)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Quick Attendance Dialog */}
      <Dialog open={quickAttOpen} onOpenChange={setQuickAttOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Quick Attendance — {format(new Date(), 'MMM d, yyyy')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Select class</Label>
              <Select value={quickAttClass} onValueChange={setQuickAttClass}>
                <SelectTrigger><SelectValue placeholder="Pick a class" /></SelectTrigger>
                <SelectContent>{myClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {classStudents.length > 0 && (
              <div className="max-h-72 overflow-y-auto space-y-2">
                {classStudents.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-lg border">
                    <span className="text-sm font-medium">{s.full_name}</span>
                    <RadioGroup value={quickMarks[s.id] || 'present'} onValueChange={v => setQuickMarks(m => ({ ...m, [s.id]: v }))} className="flex gap-2">
                      {['present', 'absent', 'late', 'excused'].map(st => (
                        <label key={st} className={`cursor-pointer px-2 py-1 rounded-full text-xs font-medium border transition ${(quickMarks[s.id] || 'present') === st ? ATT_COLORS[st] : 'bg-white text-muted-foreground border-border'}`}>
                          <RadioGroupItem value={st} className="sr-only" />{st.charAt(0).toUpperCase() + st.slice(1)}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setQuickAttOpen(false)}>Cancel</Button>
              <Button onClick={saveQuickAtt} disabled={!quickAttClass || classStudents.length === 0}>Save Attendance</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Grade Dialog */}
      <Dialog open={gradeOpen} onOpenChange={setGradeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enter Grade</DialogTitle></DialogHeader>
          <form onSubmit={saveGrade} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Student</Label>
              <Select value={gradeForm.student_id} onValueChange={v => setGradeForm({ ...gradeForm, student_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{myStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Assessment name</Label><Input value={gradeForm.assessment_name} onChange={e => setGradeForm({ ...gradeForm, assessment_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Subject</Label><Input value={gradeForm.subject_name} onChange={e => setGradeForm({ ...gradeForm, subject_name: e.target.value })} placeholder="e.g. Math" /></div>
              <div className="space-y-1.5"><Label>Score</Label><Input type="number" value={gradeForm.score} onChange={e => setGradeForm({ ...gradeForm, score: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Max score</Label><Input type="number" value={gradeForm.max_score} onChange={e => setGradeForm({ ...gradeForm, max_score: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setGradeOpen(false)}>Cancel</Button>
              <Button type="submit">Save Grade</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Behavior Note Dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Behavior Note</DialogTitle></DialogHeader>
          <form onSubmit={saveNote} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Student</Label>
              <Select value={noteForm.student_id} onValueChange={v => setNoteForm({ ...noteForm, student_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{myStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={noteForm.type} onValueChange={v => setNoteForm({ ...noteForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">✅ Positive</SelectItem>
                  <SelectItem value="concern">⚠️ Concern</SelectItem>
                  <SelectItem value="neutral">📝 Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Note</Label><Textarea rows={3} value={noteForm.note} onChange={e => setNoteForm({ ...noteForm, note: e.target.value })} placeholder="Describe the behavior..." /></div>
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={noteForm.date} onChange={e => setNoteForm({ ...noteForm, date: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
              <Button type="submit">Save Note</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}