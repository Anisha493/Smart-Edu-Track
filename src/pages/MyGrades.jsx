import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { BarChart3 } from 'lucide-react';
import { percent, gradeLetter } from '@/lib/roleUtils';

export default function MyGrades() {
  const { user } = useAuth();
  const { data: student } = useQuery({
    queryKey: ['myStudent', user?.email, user?.student_id_ref],
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

  const { data: grades = [] } = useQuery({
    queryKey: ['myGradesList', student?.id],
    queryFn: () => base44.entities.Grade.filter({ student_id: student.id }, '-date'),
    enabled: !!student?.id
  });

  return (
    <div>
      <PageHeader title="My Grades" subtitle={student ? `Academic performance for ${student.full_name}` : 'Your academic performance'} />
      <Card>
        {grades.length === 0 ? <EmptyState icon={BarChart3} title="No grades posted yet" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Assessment</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Feedback</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grades.map(g => {
                const p = percent(g.score, g.max_score);
                return (
                  <TableRow key={g.id}>
                    <TableCell className="text-sm">{g.date}</TableCell>
                    <TableCell>
                      <div>{g.assessment_name || '—'}</div>
                      <div className="text-xs text-muted-foreground capitalize">{g.assessment_type}</div>
                    </TableCell>
                    <TableCell>{g.subject_name || '—'}</TableCell>
                    <TableCell className="font-mono">{g.score}/{g.max_score}</TableCell>
                    <TableCell><Badge>{g.grade_letter || gradeLetter(p)} · {p}%</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{g.feedback}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}