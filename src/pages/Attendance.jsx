import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarCheck, Save } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { toast } from 'sonner';

const STATUSES = [
  { value: 'present', label: 'Present', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'late', label: 'Late', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'excused', label: 'Excused', color: 'bg-blue-100 text-blue-700 border-blue-200' }
];

export default function Attendance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [marks, setMarks] = useState({}); // student_id -> status

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => base44.entities.Class.list() });
  const { data: students = [] } = useQuery({
    queryKey: ['studentsByClass', classId],
    queryFn: () => base44.entities.Student.filter({ class_id: classId }),
    enabled: !!classId
  });
  const { data: existing = [] } = useQuery({
    queryKey: ['att', classId, date],
    queryFn: () => base44.entities.Attendance.filter({ class_id: classId, date }),
    enabled: !!classId && !!date
  });

  useEffect(() => {
    const map = {};
    existing.forEach(r => { map[r.student_id] = { status: r.status, id: r.id }; });
    students.forEach(s => { if (!map[s.id]) map[s.id] = { status: 'present' }; });
    setMarks(map);
  }, [existing, students]);

  const setStatus = (sid, status) => setMarks(m => ({ ...m, [sid]: { ...m[sid], status } }));

  const save = async () => {
    if (!classId) { toast.error('Select a class'); return; }
    const ops = students.map(async s => {
      const rec = marks[s.id];
      if (!rec) return;
      const payload = { student_id: s.id, class_id: classId, date, status: rec.status, marked_by: user?.email };
      if (rec.id) return base44.entities.Attendance.update(rec.id, payload);
      return base44.entities.Attendance.create(payload);
    });
    await Promise.all(ops);
    qc.invalidateQueries({ queryKey: ['att'] });
    toast.success('Attendance saved');
  };

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Mark attendance quickly and accurately" />

      <Card className="p-4 mb-4">
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <Button onClick={save} disabled={!classId || students.length === 0}>
            <Save className="w-4 h-4 mr-2" /> Save attendance
          </Button>
        </div>
      </Card>

      {!classId ? (
        <Card><EmptyState icon={CalendarCheck} title="Select a class" description="Pick a class and date above to mark attendance" /></Card>
      ) : students.length === 0 ? (
        <Card><EmptyState title="No students in this class" /></Card>
      ) : (
        <Card className="divide-y">
          {students.map(s => (
            <div key={s.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center text-sm font-semibold">
                  {s.full_name?.charAt(0)}
                </div>
                <div>
                  <div className="font-medium">{s.full_name}</div>
                  <div className="text-xs text-muted-foreground">Roll #{s.roll_number}</div>
                </div>
              </div>
              <RadioGroup
                value={marks[s.id]?.status || 'present'}
                onValueChange={v => setStatus(s.id, v)}
                className="flex gap-2 flex-wrap"
              >
                {STATUSES.map(st => (
                  <label
                    key={st.value}
                    className={`cursor-pointer px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      marks[s.id]?.status === st.value ? st.color : 'bg-white text-muted-foreground border-border'
                    }`}
                  >
                    <RadioGroupItem value={st.value} className="sr-only" />
                    {st.label}
                  </label>
                ))}
              </RadioGroup>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}