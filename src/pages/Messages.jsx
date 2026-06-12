import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { createNotification, sendEmailSafe } from '@/lib/roleUtils';
import PageHeader from '@/components/common/PageHeader';
import ThreadList from '@/components/messages/ThreadList';
import ChatWindow from '@/components/messages/ChatWindow';
import NewThreadDialog from '@/components/messages/NewThreadDialog';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

export default function Messages() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeThread, setActiveThread] = useState(null);
  const [newOpen, setNewOpen] = useState(false);

  // All messages involving this user
  const { data: allMessages = [] } = useQuery({
    queryKey: ['messages', user?.email],
    queryFn: async () => {
      const [inbox, sent] = await Promise.all([
        base44.entities.Message.filter({ to_email: user.email }, '-created_date', 200),
        base44.entities.Message.filter({ from_email: user.email }, '-created_date', 200),
      ]);
      return [...inbox, ...sent];
    },
    enabled: !!user?.email,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.email) return;
    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.data?.to_email === user.email || event.data?.from_email === user.email) {
        qc.invalidateQueries({ queryKey: ['messages', user.email] });
      }
    });
    return unsub;
  }, [user?.email]);

  // Build threads: group by thread_id (or pair key)
  const threads = buildThreads(allMessages, user?.email);

  const handleSelectThread = async (thread) => {
    setActiveThread(thread);
    // Mark unread messages in this thread as read
    const unread = thread.messages.filter(m => m.to_email === user.email && !m.read);
    await Promise.all(unread.map(m => base44.entities.Message.update(m.id, { read: true })));
    if (unread.length > 0) qc.invalidateQueries({ queryKey: ['messages', user.email] });
  };

  const handleSend = async ({ toEmail, toName, subject, body, threadId }) => {
    const tid = threadId || `thread_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const msg = await base44.entities.Message.create({
      from_email: user.email,
      from_name: user.full_name,
      to_email: toEmail,
      subject,
      body,
      read: false,
      thread_id: tid,
    });
    // Push notification
    await createNotification({
      user_email: toEmail,
      title: `New message from ${user.full_name}`,
      body: body.slice(0, 120),
      type: 'message',
      link: '/messages',
    });
    // Email notification
    sendEmailSafe(toEmail, `EduTrack — ${subject || 'New message from ' + user.full_name}`,
      `<p><b>${user.full_name}</b> sent you a message:</p><p>${body}</p><p><a href="/messages">Reply on EduTrack</a></p>`
    );
    qc.invalidateQueries({ queryKey: ['messages', user.email] });
    return tid;
  };

  // Refresh active thread from updated messages
  const activeRefreshed = activeThread
    ? threads.find(t => t.id === activeThread.id) || activeThread
    : null;

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Real-time chat between teachers and parents"
        actions={
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Edit className="w-4 h-4 mr-2" />New Conversation
          </Button>
        }
      />

      <div className="grid lg:grid-cols-5 gap-0 border border-border rounded-xl overflow-hidden bg-card" style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
        {/* Thread List */}
        <div className="lg:col-span-2 border-r border-border overflow-y-auto">
          <ThreadList
            threads={threads}
            activeThreadId={activeRefreshed?.id}
            currentUserEmail={user?.email}
            onSelect={handleSelectThread}
          />
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-3 flex flex-col overflow-hidden">
          {activeRefreshed ? (
            <ChatWindow
              thread={activeRefreshed}
              currentUser={user}
              onSend={handleSend}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <Edit className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="font-medium">Select a conversation or start a new one</p>
              <p className="text-sm mt-1">Real-time chat with read receipts</p>
            </div>
          )}
        </div>
      </div>

      <NewThreadDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        currentUser={user}
        onSend={async ({ toEmail, toName, subject, body }) => {
          const tid = await handleSend({ toEmail, toName, subject, body });
          setNewOpen(false);
          // Select the new thread after messages refresh
          setTimeout(() => {
            qc.invalidateQueries({ queryKey: ['messages', user.email] });
          }, 500);
        }}
      />
    </div>
  );
}

function buildThreads(messages, myEmail) {
  const threadMap = {};

  messages.forEach(m => {
    // Thread key: thread_id if exists, else a canonical pair key
    const tid = m.thread_id || `pair_${[m.from_email, m.to_email].sort().join('__')}`;
    if (!threadMap[tid]) {
      threadMap[tid] = { id: tid, messages: [], otherEmail: '', otherName: '', subject: '', unread: 0 };
    }
    threadMap[tid].messages.push(m);
    // Determine the other party
    if (m.from_email === myEmail) {
      threadMap[tid].otherEmail = m.to_email;
      threadMap[tid].otherName = m.to_email;
    } else {
      threadMap[tid].otherEmail = m.from_email;
      threadMap[tid].otherName = m.from_name || m.from_email;
    }
    if (m.subject && !threadMap[tid].subject) threadMap[tid].subject = m.subject;
    if (m.to_email === myEmail && !m.read) threadMap[tid].unread++;
  });

  return Object.values(threadMap)
    .map(t => ({
      ...t,
      messages: t.messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)),
      lastMessage: t.messages.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0],
    }))
    .sort((a, b) => new Date(b.lastMessage?.created_date) - new Date(a.lastMessage?.created_date));
}