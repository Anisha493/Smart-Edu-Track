import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/common/PageHeader';
import { percent, gradeLetter } from '@/lib/roleUtils';
import { toast } from 'sonner';

export default function Reports() {
  const [studentId, setStudentId] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const { data: grades = [] } = useQuery({
    queryKey: ['reportGrades', studentId],
    queryFn: () => base44.entities.Grade.filter({ student_id: studentId }),
    enabled: !!studentId
  });
  const { data: attendance = [] } = useQuery({
    queryKey: ['reportAtt', studentId],
    queryFn: () => base44.entities.Attendance.filter({ student_id: studentId }),
    enabled: !!studentId
  });

  const student = students.find(s => s.id === studentId);
  const avg = grades.length ? Math.round(grades.reduce((s, g) => s + percent(g.score, g.max_score), 0) / grades.length) : 0;
  const attRate = attendance.length ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100) : 0;

  const generateAI = async () => {
    if (!student) return;
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a concise, professional academic progress report (120 words) for student ${student.full_name}. Overall average: ${avg}% (${gradeLetter(avg)}). Attendance rate: ${attRate}%. Number of assessments: ${grades.length}. Highlight strengths, areas for improvement, and provide a friendly closing for parents.`
    });
    setAiSummary(res);
    setLoading(false);
  };

  const downloadHTML = () => {
    if (!student) return;
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Report - ${student.full_name}</title>
<style>body{font-family:sans-serif;max-width:720px;margin:40px auto;padding:40px;color:#0a2e33}
h1{color:#0a4a52}.card{border:1px solid #ddd;border-radius:8px;padding:16px;margin:12px 0}
table{width:100%;border-collapse:collapse;margin-top:12px}th,td{text-align:left;padding:8px;border-bottom:1px solid #eee}</style></head>
<body><h1>EduTrack — Academic Report</h1>
<p><b>${student.full_name}</b> · Roll #${student.roll_number}</p>
<div class="card"><b>Overall average:</b> ${avg}% (${gradeLetter(avg)})<br/><b>Attendance:</b> ${attRate}%<br/><b>Assessments:</b> ${grades.length}</div>
${aiSummary ? `<div class="card"><b>Summary</b><p>${aiSummary.replace(/\n/g,'<br/>')}</p></div>` : ''}
<h3>Grades</h3><table><tr><th>Date</th><th>Assessment</th><th>Subject</th><th>Score</th><th>Grade</th></tr>
${grades.map(g => `<tr><td>${g.date||''}</td><td>${g.assessment_name||g.assessment_type}</td><td>${g.subject_name||'-'}</td><td>${g.score}/${g.max_score}</td><td>${g.grade_letter||gradeLetter(percent(g.score,g.max_score))}</td></tr>`).join('')}
</table></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `report-${student.full_name}.html`; a.click();
    toast.success('Report downloaded');
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Generate comprehensive student progress reports" />

      <Card className="p-5 mb-5">
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Student</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name} — {s.roll_number}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button disabled={!studentId} onClick={downloadHTML}><Download className="w-4 h-4 mr-2" />Download</Button>
        </div>
      </Card>

      {student && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display font-bold text-2xl">{student.full_name}</h2>
              <p className="text-muted-foreground text-sm">Roll #{student.roll_number}</p>
            </div>
            <FileText className="w-8 h-8 text-accent" />
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-4 rounded-xl bg-secondary"><div className="text-xs text-muted-foreground">Average</div><div className="text-2xl font-display font-bold">{avg}%</div><div className="text-xs">{gradeLetter(avg)}</div></div>
            <div className="p-4 rounded-xl bg-secondary"><div className="text-xs text-muted-foreground">Attendance</div><div className="text-2xl font-display font-bold">{attRate}%</div></div>
            <div className="p-4 rounded-xl bg-secondary"><div className="text-xs text-muted-foreground">Assessments</div><div className="text-2xl font-display font-bold">{grades.length}</div></div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-semibold">AI Summary</h3>
              <Button variant="outline" size="sm" disabled={loading} onClick={generateAI}>
                <Sparkles className="w-4 h-4 mr-2" />{loading ? 'Generating...' : 'Generate'}
              </Button>
            </div>
            {aiSummary ? (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 text-sm whitespace-pre-wrap">{aiSummary}</div>
            ) : (
              <p className="text-sm text-muted-foreground">Click "Generate" to create a narrative summary with AI.</p>
            )}
          </div>

          <h3 className="font-display font-semibold mb-3">Grade History</h3>
          {grades.length === 0 ? <p className="text-sm text-muted-foreground">No grades yet</p> : (
            <div className="space-y-2">
              {grades.map(g => {
                const p = percent(g.score, g.max_score);
                return (
                  <div key={g.id} className="flex justify-between items-center p-3 rounded-lg border">
                    <div>
                      <div className="font-medium text-sm">{g.assessment_name || g.assessment_type}</div>
                      <div className="text-xs text-muted-foreground">{g.subject_name || '—'} · {g.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">{g.score}/{g.max_score}</div>
                      <div className="text-xs text-accent">{g.grade_letter || gradeLetter(p)} · {p}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}