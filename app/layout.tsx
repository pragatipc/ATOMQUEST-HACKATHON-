import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Goal Setting & Tracking Portal',
  description: 'Manage and track organizational goals efficiently',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
