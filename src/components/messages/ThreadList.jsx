import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';

export default function ThreadList({ threads, activeThreadId, currentUserEmail, onSelect }) {
  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
        <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No conversations yet</p>
        <p className="text-xs mt-1">Start a new conversation</p>
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 py-3 border-b border-border bg-secondary/30">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conversations</h3>
      </div>
      {threads.map(thread => {
        const isActive = thread.id === activeThreadId;
        const last = thread.lastMessage;
        const isMine = last?.from_email === currentUserEmail;

        return (
          <button
            key={thread.id}
            onClick={() => onSelect(thread)}
            className={cn(
              'w-full text-left px-4 py-3.5 border-b border-border/50 transition-all hover:bg-secondary/50',
              isActive ? 'bg-primary/8 border-l-2 border-l-primary' : ''
            )}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {(thread.otherName?.charAt(0) || '?').toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('text-sm truncate', thread.unread > 0 ? 'font-bold' : 'font-medium')}>
                    {thread.otherName}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {last?.created_date && formatDistanceToNow(new Date(last.created_date), { addSuffix: true })}
                  </span>
                </div>
                {thread.subject && (
                  <div className="text-xs font-medium text-muted-foreground truncate mt-0.5">{thread.subject}</div>
                )}
                <div className="flex items-center justify-between mt-0.5">
                  <p className={cn('text-xs truncate', thread.unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                    {isMine && <span className="text-muted-foreground">You: </span>}
                    {last?.body}
                  </p>
                  {thread.unread > 0 && (
                    <Badge className="ml-2 bg-primary text-white text-[10px] h-4 min-w-4 px-1 flex-shrink-0">
                      {thread.unread}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}