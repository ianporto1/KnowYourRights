'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useState } from 'react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/countries', label: 'Países', icon: '🌍' },
  { href: '/admin/categories', label: 'Categorias', icon: '📁' },
  { href: '/admin/entries', label: 'Entradas', icon: '📝' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile header */}
      <header className="lg:hidden bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
          ☰
        </button>
        <span className="font-bold">🔐 Admin</span>
        <ThemeToggle />
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-50 w-56 bg-gray-900 text-white transform transition-transform lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-4 border-b border-gray-800 hidden lg:block">
            <Link href="/admin" className="text-lg font-bold">🔐 Admin</Link>
          </div>

          <nav className="p-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 text-sm transition-colors ${
                  pathname === item.href
                    ? 'bg-indigo-600'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-800">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-lg text-sm mb-1"
            >
              🌍 Ver site
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-gray-800 rounded-lg text-sm w-full"
            >
              🚪 Sair
            </button>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
            onClick={() => setSidebarOpen(false)} 
          />
        )}

        {/* Main */}
        <main className="flex-1 min-h-screen">
          <header className="hidden lg:flex bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 justify-between items-center">
            <h1 className="font-semibold">
              {navItems.find((item) => item.href === pathname)?.label || 'Admin'}
            </h1>
            <ThemeToggle />
          </header>
          <div className="p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
