'use client';

import { usePathname } from 'next/navigation';
import { Home, Play, Gift, BookOpen, BarChart3 } from 'lucide-react';

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/play', label: '挑战', icon: Play },
  { href: '/rewards', label: '奖励', icon: Gift },
  { href: '/mistakes', label: '错题本', icon: BookOpen },
  { href: '/parent-report', label: '报告', icon: BarChart3 },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname === '/play' || pathname?.startsWith('/play/') || pathname === '/mental-math' || pathname?.startsWith('/mental-math/')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-amber-200 z-30 safe-area-bottom">
      <div className="mx-auto flex min-h-16 max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 ${
                isActive
                  ? 'bg-amber-50 text-amber-700'
                  : 'text-gray-400 hover:text-amber-500'
              }`}
            >
              <Icon
                size={22}
                fill={isActive ? 'currentColor' : 'none'}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="whitespace-nowrap text-xs font-semibold">
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
