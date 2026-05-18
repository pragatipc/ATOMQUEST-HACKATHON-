import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <span className="text-6xl">403</span>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Access denied</h1>
      <p className="mt-2 max-w-md text-slate-600">
        You do not have permission to view this page.
      </p>
      <Link href="/" className="mt-8">
        <Button>Go home</Button>
      </Link>
    </div>
  );
}
