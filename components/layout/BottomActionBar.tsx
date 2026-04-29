'use client';

import { ReactNode } from 'react';

interface BottomActionBarProps {
  children: ReactNode;
  /** 是否使用 fixed 定位，默认 false（使用普通流式布局） */
  fixed?: boolean;
  className?: string;
}

export default function BottomActionBar({
  children,
  fixed = false,
  className = '',
}: BottomActionBarProps) {
  if (fixed) {
    return (
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-20
          bg-white/90 backdrop-blur border-t-2 border-amber-200 safe-area-bottom
          ${className}
        `.trim()}
      >
        <div className="max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-3 flex gap-3">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-6 flex gap-3 flex-wrap ${className}`}>
      {children}
    </div>
  );
}
