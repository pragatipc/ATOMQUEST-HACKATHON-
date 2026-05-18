import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="manager">{children}</DashboardShell>;
}
