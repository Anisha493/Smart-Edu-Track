import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/common/PageHeader';
import { toast } from 'sonner';

export default function Settings() {
  const { user } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '');
  const [dept, setDept] = useState(user?.department || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await base44.auth.updateMe({ phone, department: dept });
    setSaving(false);
    toast.success('Profile updated');
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your profile" />
      <Card className="p-6 max-w-xl">
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Name</Label><Input value={user?.full_name || ''} disabled /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input value={user?.email || ''} disabled /></div>
          <div className="space-y-1.5"><Label>Role</Label><Input value={user?.role || 'student'} disabled className="capitalize" /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Department</Label><Input value={dept} onChange={e => setDept(e.target.value)} /></div>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
        </div>
      </Card>
    </div>
  );
}