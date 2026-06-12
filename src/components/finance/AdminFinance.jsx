import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DollarSign, Plus, CheckCircle2, Clock, AlertCircle, TrendingUp, Search, Download } from 'lucide-react';
import StatCard from '@/components/common/StatCard';
import FinancialSummary from '@/components/finance/FinancialSummary';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

const STATUS_STYLES = {
  paid:    'bg-green-100 text-green-700 border-green-200',
  unpaid:  'bg-amber-100 text-amber-700 border-amber-200',
  partial: 'bg-blue-100 text-blue-700 border-blue-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
};

const EMPTY_INVOICE = { student_id: '', title: '', description: '', amount: '', due_date: '', term: 'Term 1', academic_year: '2025-2026', notes: '' };
const EMPTY_PAYMENT = { amount_paid: '', payment_method: 'cash', payment_date: format(new Date(), 'yyyy-MM-dd'), receipt_number: '', notes: '' };

function deriveStatus(inv, paidAmount) {
  const paid = paidAmount ?? inv.amount_paid ?? 0;
  const due = inv.due_date;
  const today = format(new Date(), 'yyyy-MM-dd');
  if (paid >= inv.amount) return 'paid';
  if (paid > 0) return 'partial';
  if (due < today) return 'overdue';
  return 'unpaid';
}

export default function AdminFinance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedInv, setSelectedInv] = useState(null);
  const [form, setForm] = useState(EMPTY_INVOICE);
  const [payForm, setPayForm] = useState(EMPTY_PAYMENT);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showSummary, setShowSummary] = useState(false);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices-admin'],
    queryFn: () => base44.entities.Invoice.list('-due_date', 200)
  });
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list()
  });
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.Class.list()
  });

  const totalBilled  = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const totalPaid    = invoices.reduce((s, i) => s + (i.amount_paid || 0), 0);
  const pending      = totalBilled - totalPaid;
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  const filtered = invoices.filter(inv => {
    const matchSearch = !search || inv.student_name?.toLowerCase().includes(search.toLowerCase()) || inv.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Monthly revenue chart
  const monthlyMap = {};
  invoices.filter(i => i.amount_paid > 0 && i.payment_date).forEach(inv => {
    const m = inv.payment_date?.slice(0, 7);
    if (!m) return;
    monthlyMap[m] = (monthlyMap[m] || 0) + (inv.amount_paid || 0);
  });
  const chartData = Object.entries(monthlyMap).sort().slice(-6).map(([month, collected]) => ({
    month: month.slice(5) + '/' + month.slice(2, 4),
    collected
  }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.student_id || !form.title || !form.amount || !form.due_date) { toast.error('Fill all required fields'); return; }
    const student = students.find(s => s.id === form.student_id);
    const cls = classes.find(c => c.id === student?.class_id);
    await base44.entities.Invoice.create({
      ...form,
      amount: Number(form.amount),
      amount_paid: 0,
      status: 'unpaid',
      student_name: student?.full_name || '',
      class_id: student?.class_id || '',
      class_name: cls?.name || '',
      parent_email: student?.parent_email || '',
    });
    qc.invalidateQueries({ queryKey: ['invoices-admin'] });
    setCreateOpen(false);
    setForm(EMPTY_INVOICE);
    toast.success('Invoice created');
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!payForm.amount_paid || !payForm.payment_date) { toast.error('Enter amount and date'); return; }
    const newPaid = (selectedInv.amount_paid || 0) + Number(payForm.amount_paid);
    const newStatus = deriveStatus(selectedInv, newPaid);
    await base44.entities.Invoice.update(selectedInv.id, {
      amount_paid: newPaid,
      status: newStatus,
      payment_method: payForm.payment_method,
      payment_date: payForm.payment_date,
      receipt_number: payForm.receipt_number,
      notes: payForm.notes,
    });
    // Notify parent
    if (selectedInv.parent_email) {
      await base44.entities.Notification.create({
        user_email: selectedInv.parent_email,
        title: `Payment received: ${selectedInv.title}`,
        body: `$${Number(payForm.amount_paid).toLocaleString()} recorded on ${payForm.payment_date}. Status: ${newStatus}.`,
        type: 'success',
      });
    }
    qc.invalidateQueries({ queryKey: ['invoices-admin'] });
    setPayOpen(false);
    setSelectedInv(null);
    setPayForm(EMPTY_PAYMENT);
    toast.success('Payment recorded & parent notified');
  };

  const openPay = (inv) => { setSelectedInv(inv); setPayOpen(true); };

  return (
    <div>
      <PageHeader
        title="Finance Management"
        subtitle="Manage tuition invoices, record payments, and view financial reports"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSummary(true)}>
              <TrendingUp className="w-4 h-4 mr-2" />Financial Summary
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />New Invoice
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Billed" value={`$${totalBilled.toLocaleString()}`} icon={DollarSign} accent="primary" />
        <StatCard label="Collected" value={`$${totalPaid.toLocaleString()}`} icon={CheckCircle2} accent="accent" hint={`${totalBilled ? Math.round((totalPaid/totalBilled)*100) : 0}% collection rate`} />
        <StatCard label="Outstanding" value={`$${pending.toLocaleString()}`} icon={Clock} accent={pending > 0 ? 'warn' : 'accent'} />
        <StatCard label="Overdue" value={overdueCount} icon={AlertCircle} accent={overdueCount > 0 ? 'danger' : 'accent'} hint="invoices" />
      </div>

      {/* Revenue chart */}
      {chartData.length > 0 && (
        <Card className="p-5 mb-6">
          <h3 className="font-display font-semibold mb-3">Monthly Collections</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [`$${v.toLocaleString()}`, 'Collected']} contentStyle={{ borderRadius: 8 }} />
                <Bar dataKey="collected" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Invoice table */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by student or invoice…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground py-4">Loading…</p>}
        {!isLoading && filtered.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No invoices found</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-left">
                <th className="pb-2 font-medium">Student</th>
                <th className="pb-2 font-medium">Invoice</th>
                <th className="pb-2 font-medium">Term</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Paid</th>
                <th className="pb-2 font-medium">Balance</th>
                <th className="pb-2 font-medium">Due Date</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map(inv => {
                const balance = (inv.amount || 0) - (inv.amount_paid || 0);
                return (
                  <tr key={inv.id} className="hover:bg-secondary/30 transition">
                    <td className="py-3 font-medium">{inv.student_name}</td>
                    <td className="py-3 text-muted-foreground">{inv.title}</td>
                    <td className="py-3 text-muted-foreground">{inv.term}</td>
                    <td className="py-3 font-mono">${(inv.amount || 0).toLocaleString()}</td>
                    <td className="py-3 font-mono text-green-600">${(inv.amount_paid || 0).toLocaleString()}</td>
                    <td className="py-3 font-mono font-semibold text-destructive">${balance > 0 ? balance.toLocaleString() : '0'}</td>
                    <td className="py-3 text-muted-foreground">{inv.due_date}</td>
                    <td className="py-3">
                      <Badge className={`${STATUS_STYLES[inv.status]} border text-xs`}>{inv.status}</Badge>
                    </td>
                    <td className="py-3">
                      {inv.status !== 'paid' && (
                        <Button size="sm" variant="outline" onClick={() => openPay(inv)}>
                          Record Payment
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Student *</Label>
              <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Invoice Title *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Term 1 Tuition Fee" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount ($) *</Label>
                <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date *</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Term</Label>
                <Select value={form.term} onValueChange={v => setForm({ ...form, term: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Term 1','Term 2','Term 3','Annual'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Academic Year</Label>
                <Input value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit">Create Invoice</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Payment — {selectedInv?.title}</DialogTitle></DialogHeader>
          {selectedInv && (
            <div className="p-3 rounded-lg bg-secondary/50 text-sm mb-2">
              <div className="font-medium">{selectedInv.student_name}</div>
              <div className="text-muted-foreground">Total: ${(selectedInv.amount || 0).toLocaleString()} · Paid: ${(selectedInv.amount_paid || 0).toLocaleString()} · <span className="text-destructive font-medium">Balance: ${((selectedInv.amount || 0) - (selectedInv.amount_paid || 0)).toLocaleString()}</span></div>
            </div>
          )}
          <form onSubmit={handlePayment} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount Received ($) *</Label>
                <Input type="number" value={payForm.amount_paid} onChange={e => setPayForm({ ...payForm, amount_paid: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Date *</Label>
                <Input type="date" value={payForm.payment_date} onChange={e => setPayForm({ ...payForm, payment_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={payForm.payment_method} onValueChange={v => setPayForm({ ...payForm, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['cash','bank_transfer','card','online','other'].map(m => <SelectItem key={m} value={m}>{m.replace('_',' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Receipt Number</Label>
              <Input value={payForm.receipt_number} onChange={e => setPayForm({ ...payForm, receipt_number: e.target.value })} placeholder="e.g. RCP-2026-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
              <Button type="submit">Save Payment</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Financial Summary Modal */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Financial Summary Report</DialogTitle></DialogHeader>
          <FinancialSummary invoices={invoices} students={students} />
        </DialogContent>
      </Dialog>
    </div>
  );
}