'use client';

import Link from 'next/link';
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-amber-200 z-30 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl transition-all min-w-0 ${
                isActive
                  ? 'text-amber-600 bg-amber-50 scale-110'
                  : 'text-gray-400 hover:text-amber-500'
              }`}
            >
              <Icon
                size={22}
                fill={isActive ? 'currentColor' : 'none'}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="text-xs font-medium whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
