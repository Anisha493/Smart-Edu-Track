import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, CheckCheck, Check } from 'lucide-react';

export default function ChatWindow({ thread, currentUser, onSend }) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    await onSend({
      toEmail: thread.otherEmail,
      toName: thread.otherName,
      subject: thread.subject,
      body: body.trim(),
      threadId: thread.id,
    });
    setBody('');
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  // Group messages by date
  const grouped = groupByDate(thread.messages);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border bg-secondary/20 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white text-sm font-semibold">
          {(thread.otherName?.charAt(0) || '?').toUpperCase()}
        </div>
        <div>
          <div className="font-semibold text-sm">{thread.otherName}</div>
          {thread.subject && <div className="text-xs text-muted-foreground">{thread.subject}</div>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {grouped.map(({ date, msgs }) => (
          <div key={date}>
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{date}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            {msgs.map(m => {
              const isMine = m.from_email === currentUser.email;
              return (
                <div key={m.id} className={cn('flex mb-2', isMine ? 'justify-end' : 'justify-start')}>
                  {!isMine && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white text-[10px] font-semibold mr-2 mt-1 flex-shrink-0">
                      {(m.from_name?.charAt(0) || '?').toUpperCase()}
                    </div>
                  )}
                  <div className={cn('max-w-[72%]', isMine ? 'items-end' : 'items-start', 'flex flex-col')}>
                    <div className={cn(
                      'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
                      isMine
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-secondary text-foreground rounded-tl-sm'
                    )}>
                      {m.body}
                    </div>
                    <div className={cn('flex items-center gap-1 mt-1 text-[10px] text-muted-foreground', isMine ? 'justify-end' : 'justify-start')}>
                      <span>{m.created_date && format(new Date(m.created_date), 'h:mm a')}</span>
                      {isMine && (
                        m.read
                          ? <CheckCheck className="w-3 h-3 text-accent" title="Read" />
                          : <Check className="w-3 h-3 text-muted-foreground" title="Delivered" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 px-4 py-3 border-t border-border flex-shrink-0">
        <Textarea
          rows={1}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          className="resize-none flex-1 min-h-9 max-h-32"
        />
        <Button type="submit" size="icon" disabled={!body.trim() || sending}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}

function groupByDate(messages) {
  const map = {};
  messages.forEach(m => {
    const d = m.created_date ? format(new Date(m.created_date), 'MMM d, yyyy') : 'Unknown';
    if (!map[d]) map[d] = [];
    map[d].push(m);
  });
  return Object.entries(map).map(([date, msgs]) => ({ date, msgs }));
}