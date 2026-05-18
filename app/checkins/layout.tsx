import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function CheckinsLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="employee">{children}</DashboardShell>;
}
