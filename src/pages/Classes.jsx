import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { toast } from 'sonner';

export default function Classes() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', grade_level: '', section: '', teacher_email: '', academic_year: '', room: '' });

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => base44.entities.Class.list('-created_date') });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });

  const del = useMutation({
    mutationFn: id => base44.entities.Class.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['classes'] }); toast.success('Class removed'); }
  });

  const openEdit = (c) => {
    setEditing(c);
    setForm(c || { name: '', grade_level: '', section: '', teacher_email: '', academic_year: '', room: '' });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error('Name is required'); return; }
    if (editing) await base44.entities.Class.update(editing.id, form);
    else await base44.entities.Class.create(form);
    qc.invalidateQueries({ queryKey: ['classes'] });
    setOpen(false);
    toast.success('Saved');
  };

  return (
    <div>
      <PageHeader
        title="Classes"
        subtitle="Organize your institution into classes and sections"
        actions={<Button onClick={() => openEdit(null)}><Plus className="w-4 h-4 mr-2" />New Class</Button>}
      />

      {classes.length === 0 ? (
        <Card><EmptyState icon={BookOpen} title="No classes yet" description="Create your first class" /></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(c => (
            <Card key={c.id} className="p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => confirm('Remove?') && del.mutate(c.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <h3 className="font-display font-bold text-lg mt-3">{c.name}</h3>
              <p className="text-sm text-muted-foreground">{c.academic_year || 'Current year'} · Room {c.room || '—'}</p>
              <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex justify-between">
                <span>👨‍🏫 {c.teacher_email?.split('@')[0] || 'Unassigned'}</span>
                <span>🎓 {students.filter(s => s.class_id === c.id).length} students</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Class' : 'New Class'}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Grade 10 - A" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Grade level</Label><Input value={form.grade_level || ''} onChange={e => setForm({ ...form, grade_level: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Section</Label><Input value={form.section || ''} onChange={e => setForm({ ...form, section: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Teacher email</Label><Input type="email" value={form.teacher_email || ''} onChange={e => setForm({ ...form, teacher_email: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Academic year</Label><Input value={form.academic_year || ''} onChange={e => setForm({ ...form, academic_year: e.target.value })} placeholder="2024-2025" /></div>
              <div className="space-y-1.5"><Label>Room</Label><Input value={form.room || ''} onChange={e => setForm({ ...form, room: e.target.value })} /></div>
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