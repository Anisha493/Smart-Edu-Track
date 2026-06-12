import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import PageHeader from '@/components/common/PageHeader';
import { toast } from 'sonner';
import { percent, gradeLetter } from '@/lib/roleUtils';

const SCHOOL_DEFAULTS = { name: 'EduTrack Academy', address: '123 School Lane, Knowledge City', principal: 'Dr. A. Smith', term: 'Term 1 — 2024/2025', tagline: 'Excellence in Education' };

export default function ReportCards() {
  const [classId, setClassId] = useState('');
  const [school, setSchool] = useState(SCHOOL_DEFAULTS);
  const [comments, setComments] = useState({}); // studentId -> teacher comment
  const [generating, setGenerating] = useState(false);
  const [aiLoading, setAiLoading] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => base44.entities.Class.list() });
  const { data: allStudents = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const { data: allGrades = [] } = useQuery({ queryKey: ['grades'], queryFn: () => base44.entities.Grade.list('-date', 1000) });
  const { data: allAttendance = [] } = useQuery({ queryKey: ['attendance'], queryFn: () => base44.entities.Attendance.list('-date', 2000) });

  const students = allStudents.filter(s => s.class_id === classId);
  const className = classes.find(c => c.id === classId)?.name || '';

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const selectAll = () => setSelectedIds(students.map(s => s.id));
  const deselectAll = () => setSelectedIds([]);

  const generateAIComment = async (student) => {
    const grades = allGrades.filter(g => g.student_id === student.id);
    const att = allAttendance.filter(a => a.student_id === student.id);
    const avg = grades.length ? Math.round(grades.reduce((s, g) => s + percent(g.score, g.max_score), 0) / grades.length) : 0;
    const attRate = att.length ? Math.round((att.filter(a => a.status === 'present').length / att.length) * 100) : 0;
    setAiLoading(p => ({ ...p, [student.id]: true }));
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a 2-sentence professional teacher comment for a student report card. Student: ${student.full_name}. Average score: ${avg}% (${gradeLetter(avg)}). Attendance: ${attRate}%. Be encouraging, specific, and professional.`
    });
    setComments(p => ({ ...p, [student.id]: res }));
    setAiLoading(p => ({ ...p, [student.id]: false }));
  };

  const buildReportHTML = (student, grades, attendance) => {
    const avg = grades.length ? Math.round(grades.reduce((s, g) => s + percent(g.score, g.max_score), 0) / grades.length) : 0;
    const attRate = attendance.length ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100) : 0;
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const comment = comments[student.id] || '';

    const gradeRows = grades.map(g => {
      const p = percent(g.score, g.max_score);
      return `<tr>
        <td>${g.subject_name || '—'}</td>
        <td>${g.assessment_name || g.assessment_type}</td>
        <td>${g.date || '—'}</td>
        <td style="text-align:center;font-weight:bold;">${g.score}/${g.max_score}</td>
        <td style="text-align:center;color:${p >= 80 ? '#0a7f5e' : p >= 60 ? '#d97706' : '#dc2626'};font-weight:bold;">${g.grade_letter || gradeLetter(p)} · ${p}%</td>
      </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Report Card — ${student.full_name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #f5f9fa; padding: 40px; color: #0a2e33; }
  .page { background: white; max-width: 800px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); page-break-after: always; }
  .header { background: linear-gradient(135deg, #0a3d45 0%, #0e6375 60%, #17a2b8 100%); color: white; padding: 32px 40px; }
  .school-name { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
  .school-sub { font-size: 13px; opacity: 0.7; margin-top: 4px; }
  .term-badge { display: inline-block; background: rgba(255,255,255,0.15); border-radius: 20px; padding: 4px 14px; font-size: 12px; margin-top: 12px; }
  .body { padding: 32px 40px; }
  .student-banner { display: flex; align-items: center; gap: 20px; padding: 20px; background: #f0f9fa; border-radius: 12px; margin-bottom: 24px; border: 1px solid #cdeaf0; }
  .avatar { width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #0e6375, #17a2b8); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: 700; flex-shrink: 0; }
  .student-name { font-size: 22px; font-weight: 700; }
  .student-meta { font-size: 13px; color: #5a7a80; margin-top: 4px; }
  .kpi-row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .kpi { text-align: center; padding: 16px 8px; border-radius: 10px; border: 1px solid #e0ecee; }
  .kpi-value { font-size: 24px; font-weight: 700; color: #0e6375; }
  .kpi-label { font-size: 11px; color: #6b8c93; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #0e6375; color: white; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; }
  td { padding: 9px 12px; font-size: 13px; border-bottom: 1px solid #edf2f3; }
  tr:hover td { background: #f8fcfd; }
  .section-title { font-size: 15px; font-weight: 700; color: #0a3d45; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #cdeaf0; }
  .comment-box { background: #f0f9fa; border: 1px solid #cdeaf0; border-radius: 10px; padding: 16px; font-size: 13px; line-height: 1.7; color: #2c5a62; }
  .att-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 24px; }
  .att-cell { text-align: center; padding: 12px; border-radius: 8px; border: 1px solid #e0ecee; }
  .att-cell .num { font-size: 20px; font-weight: 700; }
  .footer { padding: 20px 40px; background: #f8fcfd; border-top: 1px solid #e0ecee; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #7a9ba0; }
  .sig-line { width: 160px; border-top: 1px solid #aaa; padding-top: 4px; text-align: center; font-size: 11px; color: #7a9ba0; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="school-name">${school.name}</div>
    <div class="school-sub">${school.address}</div>
    <div class="term-badge">📋 ${school.term}</div>
  </div>
  <div class="body">
    <div class="student-banner">
      <div class="avatar">${student.full_name.charAt(0)}</div>
      <div>
        <div class="student-name">${student.full_name}</div>
        <div class="student-meta">Roll #${student.roll_number} &nbsp;·&nbsp; Class: ${className} &nbsp;·&nbsp; ${student.gender || ''}</div>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi"><div class="kpi-value">${avg}%</div><div class="kpi-label">Avg Score</div></div>
      <div class="kpi"><div class="kpi-value">${gradeLetter(avg)}</div><div class="kpi-label">Grade</div></div>
      <div class="kpi"><div class="kpi-value">${attRate}%</div><div class="kpi-label">Attendance</div></div>
      <div class="kpi"><div class="kpi-value">${grades.length}</div><div class="kpi-label">Assessments</div></div>
    </div>

    <p class="section-title">Attendance Summary</p>
    <div class="att-grid">
      <div class="att-cell"><div class="num" style="color:#0a7f5e">${present}</div><div style="font-size:12px;color:#6b8c93;margin-top:4px;">Present</div></div>
      <div class="att-cell"><div class="num" style="color:#dc2626">${absent}</div><div style="font-size:12px;color:#6b8c93;margin-top:4px;">Absent</div></div>
      <div class="att-cell"><div class="num" style="color:#d97706">${late}</div><div style="font-size:12px;color:#6b8c93;margin-top:4px;">Late</div></div>
    </div>

    <p class="section-title">Academic Performance</p>
    ${grades.length > 0 ? `<table><thead><tr><th>Subject</th><th>Assessment</th><th>Date</th><th style="text-align:center">Score</th><th style="text-align:center">Grade</th></tr></thead><tbody>${gradeRows}</tbody></table>` : '<p style="font-size:13px;color:#7a9ba0;margin-bottom:24px;">No assessments recorded this term.</p>'}

    ${comment ? `<p class="section-title">Teacher's Comment</p><div class="comment-box">"${comment}"</div>` : ''}
  </div>
  <div class="footer">
    <div>
      <div>${school.name} — ${school.tagline}</div>
      <div>Generated on ${new Date().toLocaleDateString()}</div>
    </div>
    <div style="display:flex;gap:40px;">
      <div class="sig-line">Class Teacher</div>
      <div class="sig-line">Principal — ${school.principal}</div>
    </div>
  </div>
</div>
</body>
</html>`;
  };

  const exportAll = async () => {
    const targets = selectedIds.length > 0 ? students.filter(s => selectedIds.includes(s.id)) : students;
    if (targets.length === 0) { toast.error('No students selected'); return; }
    setGenerating(true);
    toast.info(`Generating ${targets.length} report card${targets.length > 1 ? 's' : ''}...`);

    const pages = targets.map(student => {
      const grades = allGrades.filter(g => g.student_id === student.id);
      const att = allAttendance.filter(a => a.student_id === student.id);
      return buildReportHTML(student, grades, att);
    });

    // Merge into one multi-page HTML file
    const combined = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bulk Report Cards — ${className}</title>
<style>body{background:#e5e7eb;padding:20px;}@media print{body{background:white;padding:0;}}</style>
</head><body>${pages.map(p => {
      const bodyMatch = p.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      return bodyMatch ? bodyMatch[1] : p;
    }).join('<div style="height:40px"></div>')}</body></html>`;

    const blob = new Blob([combined], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-cards-${className.replace(/\s+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setGenerating(false);
    toast.success(`${targets.length} report card${targets.length > 1 ? 's' : ''} exported!`);
  };

  return (
    <div>
      <PageHeader
        title="Bulk Report Cards"
        subtitle="Generate and export end-of-term report cards for an entire class"
        actions={
          <Button onClick={exportAll} disabled={generating || !classId}>
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {generating ? 'Generating...' : `Export ${selectedIds.length > 0 ? selectedIds.length : 'All'}`}
          </Button>
        }
      />

      {/* Config Card */}
      <Card className="p-5 mb-5">
        <h3 className="font-display font-semibold mb-4">School Branding & Settings</h3>
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select value={classId} onValueChange={v => { setClassId(v); setSelectedIds([]); }}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>School Name</Label><Input value={school.name} onChange={e => setSchool({ ...school, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Principal</Label><Input value={school.principal} onChange={e => setSchool({ ...school, principal: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Term</Label><Input value={school.term} onChange={e => setSchool({ ...school, term: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Address</Label><Input value={school.address} onChange={e => setSchool({ ...school, address: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Tagline</Label><Input value={school.tagline} onChange={e => setSchool({ ...school, tagline: e.target.value })} /></div>
        </div>
      </Card>

      {/* Student list */}
      {!classId ? (
        <Card className="p-10 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Select a class above to manage report cards</p>
        </Card>
      ) : students.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">No students in this class</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{students.length} students in {className}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>Deselect All</Button>
            </div>
          </div>

          {students.map(student => {
            const grades = allGrades.filter(g => g.student_id === student.id);
            const att = allAttendance.filter(a => a.student_id === student.id);
            const avg = grades.length ? Math.round(grades.reduce((s, g) => s + percent(g.score, g.max_score), 0) / grades.length) : 0;
            const attRate = att.length ? Math.round((att.filter(a => a.status === 'present').length / att.length) * 100) : 0;
            const isSelected = selectedIds.includes(student.id);

            return (
              <Card key={student.id} className={`p-4 transition ${isSelected ? 'border-primary ring-1 ring-primary' : ''}`}>
                <div className="flex items-start gap-4">
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(student.id)} className="mt-1" />
                  <div className="flex-1 grid md:grid-cols-4 gap-4">
                    <div>
                      <div className="font-semibold">{student.full_name}</div>
                      <div className="text-xs text-muted-foreground">Roll #{student.roll_number}</div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div><span className="text-muted-foreground text-xs block">Avg</span><span className="font-bold">{avg}% ({gradeLetter(avg)})</span></div>
                      <div><span className="text-muted-foreground text-xs block">Attend</span><span className="font-bold">{attRate}%</span></div>
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Teacher Comment</Label>
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2" disabled={aiLoading[student.id]} onClick={() => generateAIComment(student)}>
                          {aiLoading[student.id] ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                          AI
                        </Button>
                      </div>
                      <Textarea
                        rows={2}
                        placeholder="Add a personal comment for this student's report card..."
                        value={comments[student.id] || ''}
                        onChange={e => setComments(p => ({ ...p, [student.id]: e.target.value }))}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}