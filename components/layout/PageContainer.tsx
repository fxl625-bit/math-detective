import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  /** 底部是否需要额外留白（用于 fixed bottom bar） */
  bottomPadding?: boolean;
}

export default function PageContainer({
  children,
  className = '',
  bottomPadding = false,
}: PageContainerProps) {
  return (
    <div
      className={`
        mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8
        space-y-4
        ${bottomPadding ? 'pb-28 sm:pb-32' : 'pb-4'}
        ${className}
      `.trim()}
    >
      {children}
    </div>
  );
}
