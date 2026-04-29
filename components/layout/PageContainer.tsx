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
        w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-4xl mx-auto
        px-4 py-4 space-y-4
        ${bottomPadding ? 'pb-28' : 'pb-4'}
        ${className}
      `.trim()}
    >
      {children}
    </div>
  );
}
