import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/common/PageHeader';
import AdminFinance from '@/components/finance/AdminFinance';
import ParentFinance from '@/components/finance/ParentFinance';

export default function Finance() {
  const { user } = useAuth();
  const role = user?.role || 'parent';

  if (role === 'admin' || role === 'teacher') return <AdminFinance />;
  return <ParentFinance />;
}