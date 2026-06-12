import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import StatCard from '@/components/common/StatCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const STATUS_STYLES = {
  paid:    'bg-green-100 text-green-700 border-green-200',
  unpaid:  'bg-amber-100 text-amber-700 border-amber-200',
  partial: 'bg-blue-100 text-blue-700 border-blue-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_ICONS = {
  paid:    <CheckCircle2 className="w-3.5 h-3.5" />,
  unpaid:  <Clock className="w-3.5 h-3.5" />,
  partial: <AlertCircle className="w-3.5 h-3.5" />,
  overdue: <AlertCircle className="w-3.5 h-3.5" />,
};

export default function ParentFinance() {
  const { user } = useAuth();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices-parent', user?.email],
    queryFn: () => base44.entities.Invoice.filter({ parent_email: user.email }, '-due_date', 50),
    enabled: !!user?.email
  });

  const totalDue    = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const totalPaid   = invoices.reduce((s, i) => s + (i.amount_paid || 0), 0);
  const pending     = totalDue - totalPaid;
  const overdueList = invoices.filter(i => i.status === 'overdue');

  const pieData = [
    { name: 'Paid', value: totalPaid, color: '#22c55e' },
    { name: 'Pending', value: pending > 0 ? pending : 0, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  return (
    <div>
      <PageHeader title="Finance & Invoices" subtitle="View your tuition invoices and payment history" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Billed" value={`$${totalDue.toLocaleString()}`} icon={DollarSign} accent="primary" />
        <StatCard label="Total Paid" value={`$${totalPaid.toLocaleString()}`} icon={CheckCircle2} accent="accent" hint="across all invoices" />
        <StatCard label="Pending Balance" value={`$${pending.toLocaleString()}`} icon={Clock} accent={pending > 0 ? 'warn' : 'accent'} />
        <StatCard label="Overdue" value={overdueList.length} icon={AlertCircle} accent={overdueList.length > 0 ? 'danger' : 'accent'} hint="invoices" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        {/* Payment breakdown donut */}
        <Card className="p-5">
          <h3 className="font-display font-semibold mb-4">Payment Breakdown</h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No invoices yet</p>
          ) : (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3}>
                      {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={v => [`$${v.toLocaleString()}`, '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span>{d.name} <span className="font-medium">${d.value.toLocaleString()}</span></span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Invoice list */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-display font-semibold mb-4">All Invoices</h3>
          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!isLoading && invoices.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No invoices found for your account.</p>
          )}
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {invoices.map(inv => {
              const balance = (inv.amount || 0) - (inv.amount_paid || 0);
              return (
                <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl border border-border/60 hover:bg-secondary/30 transition">
                  <div>
                    <div className="font-medium text-sm">{inv.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {inv.student_name} · {inv.term} · Due {inv.due_date}
                    </div>
                    {inv.description && <div className="text-xs text-muted-foreground mt-0.5">{inv.description}</div>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="font-mono font-semibold text-sm">${(inv.amount || 0).toLocaleString()}</div>
                      {balance > 0 && <div className="text-xs text-destructive font-medium">Balance: ${balance.toLocaleString()}</div>}
                      {balance <= 0 && <div className="text-xs text-green-600 font-medium">Fully paid</div>}
                    </div>
                    <Badge className={`${STATUS_STYLES[inv.status]} flex items-center gap-1 border`}>
                      {STATUS_ICONS[inv.status]} {inv.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Payment history */}
      <Card className="p-5">
        <h3 className="font-display font-semibold mb-4">Payment History</h3>
        {invoices.filter(i => i.amount_paid > 0).length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="pb-2 font-medium">Invoice</th>
                  <th className="pb-2 font-medium">Student</th>
                  <th className="pb-2 font-medium">Amount Paid</th>
                  <th className="pb-2 font-medium">Method</th>
                  <th className="pb-2 font-medium">Payment Date</th>
                  <th className="pb-2 font-medium">Receipt #</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {invoices.filter(i => i.amount_paid > 0).map(inv => (
                  <tr key={inv.id} className="py-2">
                    <td className="py-2.5 font-medium">{inv.title}</td>
                    <td className="py-2.5 text-muted-foreground">{inv.student_name}</td>
                    <td className="py-2.5 font-mono font-semibold text-green-600">${(inv.amount_paid || 0).toLocaleString()}</td>
                    <td className="py-2.5 capitalize">{inv.payment_method?.replace('_', ' ') || '—'}</td>
                    <td className="py-2.5 text-muted-foreground">{inv.payment_date || '—'}</td>
                    <td className="py-2.5 font-mono text-xs text-muted-foreground">{inv.receipt_number || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}