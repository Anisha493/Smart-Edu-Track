import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { toast } from 'sonner';
import { percent, gradeLetter, createNotification, sendEmailSafe } from '@/lib/roleUtils';

const ASSESSMENT_TYPES = ['quiz', 'assignment', 'midterm', 'final', 'project', 'other'];

export default function Grades() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [filterClass, setFilterClass] = useState('');

  const { data: grades = [] } = useQuery({ queryKey: ['grades'], queryFn: () => base44.entities.Grade.list('-date', 200) });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => base44.entities.Class.list() });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => base44.entities.Subject.list() });

  const del = useMutation({
    mutationFn: id => base44.entities.Grade.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grades'] }); toast.success('Grade removed'); }
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      student_id: '', subject_id: '', class_id: '', assessment_type: 'assignment',
      assessment_name: '', score: '', max_score: 100, date: format(new Date(), 'yyyy-MM-dd'), feedback: ''
    });
    setOpen(true);
  };

  const openEdit = (g) => { setEditing(g); setForm(g); setOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    if (!form.student_id || form.score === '' || !form.max_score) {
      toast.error('Student, score and max are required');
      return;
    }
    const subject = subjects.find(s => s.id === form.subject_id);
    const pct = percent(Number(form.score), Number(form.max_score));
    const payload = {
      ...form,
      score: Number(form.score),
      max_score: Number(form.max_score),
      subject_name: subject?.name || form.subject_name || '',
      grade_letter: gradeLetter(pct),
      graded_by: user?.email
    };
    if (editing) await base44.entities.Grade.update(editing.id, payload);
    else {
      await base44.entities.Grade.create(payload);
      const student = students.find(s => s.id === form.student_id);
      if (student?.email) {
        await createNotification({
          user_email: student.email,
          title: `New grade: ${payload.assessment_name || payload.assessment_type}`,
          body: `You scored ${payload.score}/${payload.max_score} (${pct}% · ${payload.grade_letter})`,
          type: 'grade'
        });
        sendEmailSafe(student.email, `New grade posted — ${payload.assessment_name || payload.assessment_type}`,
          `<p>Hi ${student.full_name},</p><p>A new grade has been posted: <b>${payload.score}/${payload.max_score}</b> (${pct}% — ${payload.grade_letter}).</p><p>— EduTrack</p>`);
      }
    }
    qc.invalidateQueries({ queryKey: ['grades'] });
    setOpen(false);
    toast.success('Saved');
  };

  const filtered = filterClass ? grades.filter(g => g.class_id === filterClass) : grades;
  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

  return (
    <div>
      <PageHeader
        title="Grades"
        subtitle="Record and review student assessments"
        actions={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add Grade</Button>}
      />

      <Card className="p-4 mb-4">
        <div className="max-w-xs">
          <Select value={filterClass} onValueChange={v => setFilterClass(v === 'all' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Filter by class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={BarChart3} title="No grades yet" description="Record your first assessment" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Assessment</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(g => {
                const p = percent(g.score, g.max_score);
                return (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{studentMap[g.student_id]?.full_name || '—'}</TableCell>
                    <TableCell>
                      <div>{g.assessment_name || '—'}</div>
                      <div className="text-xs text-muted-foreground capitalize">{g.assessment_type}</div>
                    </TableCell>
                    <TableCell>{g.subject_name || '—'}</TableCell>
                    <TableCell className="font-mono">{g.score}/{g.max_score}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{g.grade_letter || gradeLetter(p)} · {p}%</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{g.date}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(g)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => confirm('Remove?') && del.mutate(g.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? 'Edit Grade' : 'Add Grade'}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Student *</Label>
                <Select value={form.student_id || ''} onValueChange={v => setForm({ ...form, student_id: v, class_id: students.find(s=>s.id===v)?.class_id || form.class_id })}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Select value={form.subject_id || ''} onValueChange={v => setForm({ ...form, subject_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assessment type</Label>
                <Select value={form.assessment_type || 'assignment'} onValueChange={v => setForm({ ...form, assessment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ASSESSMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Assessment name</Label><Input value={form.assessment_name || ''} onChange={e => setForm({ ...form, assessment_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Score *</Label><Input type="number" value={form.score ?? ''} onChange={e => setForm({ ...form, score: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Max score *</Label><Input type="number" value={form.max_score ?? 100} onChange={e => setForm({ ...form, max_score: e.target.value })} /></div>
              <div className="space-y-1.5 md:col-span-2"><Label>Date</Label><Input type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Feedback</Label><Textarea rows={3} value={form.feedback || ''} onChange={e => setForm({ ...form, feedback: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}