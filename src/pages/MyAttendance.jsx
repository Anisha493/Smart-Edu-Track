import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatCard from '@/components/common/StatCard';
import { CalendarCheck } from 'lucide-react';

const statusColors = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-amber-100 text-amber-700',
  excused: 'bg-blue-100 text-blue-700'
};

export default function MyAttendance() {
  const { user } = useAuth();
  const { data: student } = useQuery({
    queryKey: ['myStudentAtt', user?.email, user?.student_id_ref],
    queryFn: async () => {
      if (user.student_id_ref) {
        const list = await base44.entities.Student.filter({ id: user.student_id_ref });
        return list[0];
      }
      const list = await base44.entities.Student.filter({ email: user.email });
      return list[0];
    },
    enabled: !!user
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['myAttList', student?.id],
    queryFn: () => base44.entities.Attendance.filter({ student_id: student.id }, '-date'),
    enabled: !!student?.id
  });

  const present = attendance.filter(a => a.status === 'present').length;
  const absent = attendance.filter(a => a.status === 'absent').length;
  const late = attendance.filter(a => a.status === 'late').length;
  const rate = attendance.length ? Math.round((present / attendance.length) * 100) : 0;

  return (
    <div>
      <PageHeader title="My Attendance" subtitle={student ? student.full_name : 'Your attendance record'} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Rate" value={`${rate}%`} icon={CalendarCheck} accent={rate >= 80 ? 'accent' : 'warn'} />
        <StatCard label="Present" value={present} />
        <StatCard label="Absent" value={absent} accent="danger" />
        <StatCard label="Late" value={late} accent="warn" />
      </div>

      <Card>
        {attendance.length === 0 ? <EmptyState icon={CalendarCheck} title="No attendance records" /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader>
            <TableBody>
              {attendance.map(a => (
                <TableRow key={a.id}>
                  <TableCell>{a.date}</TableCell>
                  <TableCell><Badge className={statusColors[a.status]}>{a.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.remarks || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}