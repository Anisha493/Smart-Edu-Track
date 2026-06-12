import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { toast } from 'sonner';

export default function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['notifsAll', user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email }, '-created_date', 100),
    enabled: !!user?.email
  });

  const markAll = async () => {
    const unread = items.filter(i => !i.read);
    await Promise.all(unread.map(i => base44.entities.Notification.update(i.id, { read: true })));
    qc.invalidateQueries({ queryKey: ['notifsAll'] });
    qc.invalidateQueries({ queryKey: ['notifications'] });
    toast.success('All marked as read');
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Stay on top of what matters"
        actions={<Button variant="outline" onClick={markAll}><CheckCheck className="w-4 h-4 mr-2" />Mark all read</Button>}
      />

      {items.length === 0 ? (
        <Card><EmptyState icon={Bell} title="No notifications" /></Card>
      ) : (
        <div className="space-y-2">
          {items.map(n => (
            <Card key={n.id} className={`p-4 ${!n.read ? 'border-accent bg-accent/5' : ''}`}>
              <div className="flex gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${!n.read ? 'bg-accent/20' : 'bg-secondary'}`}>
                  <Bell className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{n.title}</span>
                    <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
                  </div>
                  {n.body && <div className="text-sm text-muted-foreground mt-1">{n.body}</div>}
                  <div className="text-xs text-muted-foreground mt-2">
                    {n.created_date && formatDistanceToNow(new Date(n.created_date), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}