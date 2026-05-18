'use client';

import { useEffect, useState } from 'react';

interface AdminStats {
  totalEmployees: number;
  approvedGoalsCount: number;
  submittedGoalsCount: number;
  checkInsCompleted: number;
  checkInsRequired: number;
  checkInPercentage: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading || !stats) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {/* Total Employees Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalEmployees}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-xl">
              👥
            </div>
          </div>
        </div>

        {/* Approved Goals Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Approved Goals</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.approvedGoalsCount}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-xl">
              ✓
            </div>
          </div>
        </div>

        {/* Pending Approvals Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pending Approvals</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.submittedGoalsCount}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-xl">
              ⏳
            </div>
          </div>
        </div>

        {/* Check-ins Progress Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600 text-sm font-medium">Check-Ins Progress</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {stats.checkInsCompleted} / {stats.checkInsRequired}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-xl">
              💬
            </div>
          </div>
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${stats.checkInPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600 mt-2 font-semibold">{stats.checkInPercentage}% Complete</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex gap-4 flex-wrap">
          <a
            href="/admin/users"
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition"
          >
            Manage Users
          </a>
          <a
            href="/admin/cycles"
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
          >
            Manage Cycles
          </a>
          <a
            href="/admin/goals"
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
          >
            View All Goals
          </a>
          <a
            href="/admin/reports"
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
          >
            Generate Reports
          </a>
        </div>
      </div>
    </div>
  );
}
