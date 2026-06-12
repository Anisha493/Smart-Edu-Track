import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StudentForm from '@/components/students/StudentForm';

export default function Students() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: students = [], isLoading } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list('-created_date') });
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => base44.entities.Class.list() });

  const del = useMutation({
    mutationFn: (id) => base44.entities.Student.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); toast.success('Student removed'); }
  });

  const filtered = students.filter(s =>
    !search ||
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Manage student records across classes"
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Student
          </Button>
        }
      />

      <Card className="p-4 mb-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, roll, or email" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No students yet" description="Add your first student to get started" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Roll #</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center text-xs font-semibold">
                        {s.full_name?.charAt(0)}
                      </div>
                      <span className="font-medium">{s.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{s.roll_number}</TableCell>
                  <TableCell>{classMap[s.class_id] || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email || '—'}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{s.status || 'active'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm('Remove this student?')) del.mutate(s.id); }}>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Student' : 'Add Student'}</DialogTitle>
          </DialogHeader>
          <StudentForm
            student={editing}
            classes={classes}
            onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ['students'] }); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}