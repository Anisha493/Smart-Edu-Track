import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, BookMarked } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

const BLANK = { name: '', code: '', class_id: '', teacher_email: '', description: '', credits: '' };

export default function Subjects() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [filterClass, setFilterClass] = useState('');

  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => base44.entities.Subject.list('-created_date', 200) });
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => base44.entities.Class.list() });
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const all = await base44.entities.User.list();
      return all.filter(u => u.role === 'teacher' || u.role === 'admin');
    }
  });

  const del = useMutation({
    mutationFn: id => base44.entities.Subject.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); toast.success('Subject removed'); }
  });

  const openNew = () => { setEditing(null); setForm(BLANK); setOpen(true); };
  const openEdit = (s) => { setEditing(s); setForm(s); setOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error('Name is required'); return; }
    const payload = { ...form, credits: form.credits ? Number(form.credits) : undefined };
    if (editing) await base44.entities.Subject.update(editing.id, payload);
    else await base44.entities.Subject.create(payload);
    qc.invalidateQueries({ queryKey: ['subjects'] });
    setOpen(false);
    toast.success('Saved');
  };

  const filtered = filterClass ? subjects.filter(s => s.class_id === filterClass) : subjects;
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));

  return (
    <div>
      <PageHeader
        title="Subjects"
        subtitle="Manage subjects and assign teachers"
        actions={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add Subject</Button>}
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
          <EmptyState icon={BookMarked} title="No subjects yet" description="Add your first subject" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">{s.code || '—'}</TableCell>
                  <TableCell>{classMap[s.class_id] || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.teacher_email?.split('@')[0] || '—'}</TableCell>
                  <TableCell>{s.credits || '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => confirm('Remove this subject?') && del.mutate(s.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Subject' : 'Add Subject'}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" />
              </div>
              <div className="space-y-1.5">
                <Label>Subject code</Label>
                <Input value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="MATH-10" />
              </div>
              <div className="space-y-1.5">
                <Label>Credits</Label>
                <Input type="number" value={form.credits || ''} onChange={e => setForm({ ...form, credits: e.target.value })} placeholder="3" />
              </div>
              <div className="space-y-1.5">
                <Label>Class</Label>
                <Select value={form.class_id || ''} onValueChange={v => setForm({ ...form, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Teacher</Label>
                <Select value={form.teacher_email || ''} onValueChange={v => setForm({ ...form, teacher_email: v })}>
                  <SelectTrigger><SelectValue placeholder="Assign teacher" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map(t => <SelectItem key={t.id} value={t.email}>{t.full_name || t.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
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