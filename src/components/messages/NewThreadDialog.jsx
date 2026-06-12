import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

export default function NewThreadDialog({ open, onOpenChange, currentUser, onSend }) {
  const [form, setForm] = useState({ to_email: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => base44.entities.User.list(),
    enabled: open,
  });

  const recipients = users.filter(u => u.email !== currentUser?.email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.to_email || !form.body.trim()) { toast.error('Recipient and message are required'); return; }
    setSending(true);
    await onSend({ toEmail: form.to_email, subject: form.subject, body: form.body.trim() });
    setForm({ to_email: '', subject: '', body: '' });
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Conversation</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>To *</Label>
            {recipients.length > 0 ? (
              <Select value={form.to_email} onValueChange={v => setForm({ ...form, to_email: v })}>
                <SelectTrigger><SelectValue placeholder="Select recipient…" /></SelectTrigger>
                <SelectContent>
                  {recipients.map(u => (
                    <SelectItem key={u.id} value={u.email}>
                      {u.full_name} <span className="text-muted-foreground">({u.role})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type="email"
                placeholder="recipient@email.com"
                value={form.to_email}
                onChange={e => setForm({ ...form, to_email: e.target.value })}
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Regarding Aarav's attendance…" />
          </div>
          <div className="space-y-1.5">
            <Label>Message *</Label>
            <Textarea rows={4} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Write your message…" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={sending}>
              <Send className="w-4 h-4 mr-2" />{sending ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}