import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function StatCard({ label, value, icon: Icon, hint, accent = 'primary' }) {
  const tones = {
    primary: 'from-primary/10 to-accent/10 text-primary',
    accent: 'from-accent/15 to-primary/10 text-accent',
    warn: 'from-amber-100 to-amber-50 text-amber-700',
    danger: 'from-red-100 to-red-50 text-red-600'
  };
  return (
    <Card className="p-5 border-border/60 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="mt-2 text-3xl font-display font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center", tones[accent])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </Card>
  );
}