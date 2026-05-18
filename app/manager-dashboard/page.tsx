'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface DashboardStats {
  teamSize: number;
  pendingApprovals: number;
  checkInsDone: number;
}

export default function ManagerDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    teamSize: 0,
    pendingApprovals: 0,
    checkInsDone: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Get team members
        const usersRes = await fetch('/api/admin/users?role=employee');
        const users = await usersRes.json();
        const teamMembers = users.filter((u: any) => u.managerId === session?.user?.id);

        // Get pending approvals
        const goalsRes = await fetch('/api/goals?status=submitted');
        const goals = await goalsRes.json();
        const pending = goals.filter((g: any) =>
          teamMembers.some((m: any) => m._id === g.employeeId._id || g.employeeId === m._id)
        );

        setStats({
          teamSize: teamMembers.length,
          pendingApprovals: pending.length,
          checkInsDone: 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    if (session?.user?.id) {
      fetchStats();
    }
  }, [session?.user?.id]);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Manager Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {/* Team Size Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Team Size</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.teamSize}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-xl">
              👥
            </div>
          </div>
        </div>

        {/* Pending Approvals Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pending Approvals</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.pendingApprovals}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-xl">
              ⏳
            </div>
          </div>
        </div>

        {/* Check-Ins Done Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Check-Ins Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.checkInsDone}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-xl">
              ✓
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex gap-4 flex-wrap">
          <a
            href="/manager/approvals"
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition"
          >
            Review Goal Submissions
          </a>
          <a
            href="/manager/team"
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
          >
            View Team Members
          </a>
          <a
            href="/manager/checkins"
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
          >
            Conduct Check-ins
          </a>
        </div>
      </div>
    </div>
  );
}
