import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function StudentForm({ student, classes, onDone }) {
  const [form, setForm] = useState(student || {
    full_name: '', email: '', roll_number: '', class_id: '', gender: 'male',
    parent_email: '', phone: '', address: '', status: 'active'
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.roll_number) {
      toast.error('Name and roll number are required');
      return;
    }
    setSaving(true);
    if (student) await base44.entities.Student.update(student.id, form);
    else await base44.entities.Student.create(form);
    setSaving(false);
    toast.success(student ? 'Student updated' : 'Student added');
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Full name *</Label>
          <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Roll number *</Label>
          <Input value={form.roll_number} onChange={e => set('roll_number', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Parent email</Label>
          <Input type="email" value={form.parent_email || ''} onChange={e => set('parent_email', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Class</Label>
          <Select value={form.class_id || ''} onValueChange={v => set('class_id', v)}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Gender</Label>
          <Select value={form.gender || 'male'} onValueChange={v => set('gender', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status || 'active'} onValueChange={v => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="graduated">Graduated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Address</Label>
        <Textarea value={form.address || ''} onChange={e => set('address', e.target.value)} rows={2} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
      </div>
    </form>
  );
}