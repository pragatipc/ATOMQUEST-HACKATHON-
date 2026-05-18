import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function GoalsLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="employee">{children}</DashboardShell>;
}
