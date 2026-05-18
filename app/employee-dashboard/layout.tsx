'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session && session.user?.role !== 'employee') {
      router.push('/');
    }
  }, [session, router]);

  if (!session) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Goals Portal</h1>
          <p className="text-sm text-gray-600 mt-1">Employee Dashboard</p>
        </div>

        <nav className="mt-8 px-4 space-y-2">
          <Link
            href="/employee-dashboard"
            className="block px-4 py-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium transition"
          >
            📊 Dashboard
          </Link>
          <Link
            href="/employee-goals"
            className="block px-4 py-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium transition"
          >
            🎯 My Goals
          </Link>
          <Link
            href="/employee-checkins"
            className="block px-4 py-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 font-medium transition"
          >
            ✓ Check-Ins
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 w-64 p-4 border-t border-gray-200 bg-white">
          <div className="text-sm text-gray-600 mb-4">
            <p className="font-medium text-gray-900">{session.user?.name}</p>
            <p className="text-xs text-gray-500">{session.user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
