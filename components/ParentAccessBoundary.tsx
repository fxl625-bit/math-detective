'use client';

import { useState, type ReactNode } from 'react';
import ParentPasswordGate from '@/components/ParentPasswordGate';
import { grantParentAccess, useParentAccess } from '@/hooks/useParentAccess';

export default function ParentAccessBoundary({ children, onCancel }: { children: ReactNode; onCancel?: () => void }) {
  const authorized = useParentAccess();
  const [open, setOpen] = useState(true);

  if (authorized) return <>{children}</>;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-xl border border-blue-300 bg-white px-4 font-bold text-blue-900">验证家长密码以继续</button>;
  return <ParentPasswordGate onSuccess={() => grantParentAccess()} onCancel={() => { setOpen(false); onCancel?.(); }} />;
}
