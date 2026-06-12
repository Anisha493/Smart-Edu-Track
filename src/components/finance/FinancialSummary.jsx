import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const STATUS_COLORS = { paid: '#22c55e', partial: '#3b82f6', unpaid: '#f59e0b', overdue: '#ef4444' };

export default function FinancialSummary({ invoices, students }) {
  const totalBilled  = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const totalPaid    = invoices.reduce((s, i) => s + (i.amount_paid || 0), 0);
  const pending      = totalBilled - totalPaid;
  const collectionRate = totalBilled ? Math.round((totalPaid / totalBilled) * 100) : 0;

  const statusCounts = { paid: 0, partial: 0, unpaid: 0, overdue: 0 };
  invoices.forEach(i => { statusCounts[i.status] = (statusCounts[i.status] || 0) + 1; });

  const pieData = Object.entries(statusCounts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] }));

  // Per-student summary
  const studentMap = {};
  invoices.forEach(inv => {
    if (!studentMap[inv.student_id]) studentMap[inv.student_id] = { name: inv.student_name, billed: 0, paid: 0 };
    studentMap[inv.student_id].billed += inv.amount || 0;
    studentMap[inv.student_id].paid += inv.amount_paid || 0;
  });
  const studentRows = Object.values(studentMap).sort((a, b) => b.billed - a.billed);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Billed', value: `$${totalBilled.toLocaleString()}`, color: 'text-foreground' },
          { label: 'Collected', value: `$${totalPaid.toLocaleString()}`, color: 'text-green-600' },
          { label: 'Outstanding', value: `$${pending.toLocaleString()}`, color: 'text-amber-600' },
          { label: 'Collection Rate', value: `${collectionRate}%`, color: collectionRate >= 80 ? 'text-green-600' : 'text-red-500' },
        ].map(k => (
          <div key={k.label} className="p-3 rounded-xl border bg-card text-center">
            <div className={`text-xl font-bold font-mono ${k.color}`}>{k.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Status distribution */}
        <div>
          <h4 className="font-semibold text-sm mb-2">Invoice Status Distribution</h4>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" outerRadius={60} paddingAngle={3}>
                  {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-1">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                <span className="capitalize">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Per-student */}
        <div>
          <h4 className="font-semibold text-sm mb-2">Per-Student Summary</h4>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {studentRows.map((s, i) => {
              const rate = s.billed ? Math.round((s.paid / s.billed) * 100) : 0;
              return (
                <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg border">
                  <span className="font-medium">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">${s.billed.toLocaleString()}</span>
                    <span className="text-green-600 font-medium">${s.paid.toLocaleString()} paid</span>
                    <Badge className={`text-[10px] px-1.5 ${rate === 100 ? 'bg-green-100 text-green-700' : rate > 0 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{rate}%</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Download className="w-4 h-4 mr-2" />Print Report
        </Button>
      </div>
    </div>
  );
}
