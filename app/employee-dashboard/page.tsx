'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardStats {
  totalGoals: number;
  approvedGoals: number;
  avgScore: number;
  pendingCheckIns: number;
}

export default function EmployeeDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    totalGoals: 0,
    approvedGoals: 0,
    avgScore: 0,
    pendingCheckIns: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [goalsRes, achievementsRes] = await Promise.all([
          fetch(`/api/goals?employeeId=${session?.user?.id}`),
          fetch(`/api/achievements?employeeId=${session?.user?.id}`),
        ]);

        const goals = await goalsRes.json();
        const achievements = await achievementsRes.json();

        const approvedGoals = goals.filter((g: any) => g.status === 'locked').length;
        const avgScore =
          achievements.length > 0
            ? Math.round(
              achievements.reduce((sum: number, a: any) => sum + a.computedScore, 0) /
              achievements.length
            )
            : 0;

        setStats({
          totalGoals: goals.length,
          approvedGoals,
          avgScore,
          pendingCheckIns: 0,
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Welcome back, {session?.user?.name}! 👋</h1>
          <p className="text-blue-100 text-lg">Track and achieve your goals</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Total Goals Card */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-8 border-l-4 border-blue-500">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-500 text-sm font-semibold uppercase tracking-wide">Total Goals</p>
                <p className="text-4xl font-bold text-gray-900 mt-3">{stats.totalGoals}</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                🎯
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-blue-400 to-transparent rounded-full"></div>
          </div>

          {/* Approved Goals Card */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-8 border-l-4 border-green-500">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-500 text-sm font-semibold uppercase tracking-wide">Approved Goals</p>
                <p className="text-4xl font-bold text-green-600 mt-3">{stats.approvedGoals}</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-50 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                ✓
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-green-400 to-transparent rounded-full"></div>
          </div>

          {/* Average Score Card */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-8 border-l-4 border-purple-500">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-500 text-sm font-semibold uppercase tracking-wide">Avg Score</p>
                <p className="text-4xl font-bold text-purple-600 mt-3">{stats.avgScore}%</p>
                <p className="text-xs text-gray-500 mt-2">Performance</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                📈
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-purple-400 to-transparent rounded-full"></div>
          </div>

          {/* Pending Check-ins Card */}
          <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-8 border-l-4 border-orange-500">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-500 text-sm font-semibold uppercase tracking-wide">Check-ins Due</p>
                <p className="text-4xl font-bold text-orange-600 mt-3">{stats.pendingCheckIns}</p>
                <p className="text-xs text-gray-500 mt-2">Upcoming</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                📅
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-orange-400 to-transparent rounded-full"></div>
          </div>
        </div>

      {/* Quick Actions Section */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/employee-goals/new"
            className="group bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-4 font-semibold rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2"
          >
            <span className="text-xl">➕</span>
            Create New Goal
          </Link>
          <Link
            href="/employee-goals"
            className="group bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-6 py-4 font-semibold rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2"
          >
            <span className="text-xl">📋</span>
            View All Goals
          </Link>
          <Link
            href="/employee-checkins"
            className="group bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-6 py-4 font-semibold rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2"
          >
            <span className="text-xl">💬</span>
            Add Check-in
          </Link>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            Getting Started
          </h3>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold">1.</span>
              <span>Create your first goal aligned with organizational objectives</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold">2.</span>
              <span>Get manager approval on your proposed goals</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold">3.</span>
              <span>Track progress through regular check-ins</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold">4.</span>
              <span>Review quarterly achievements and scores</span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-8 border border-blue-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Your Progress
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">Goal Completion Rate</span>
                <span className="text-sm font-bold text-blue-600">{stats.totalGoals > 0 ? Math.round((stats.approvedGoals / stats.totalGoals) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${stats.totalGoals > 0 ? (stats.approvedGoals / stats.totalGoals) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              {stats.approvedGoals > 0 
                ? `Great work! ${stats.approvedGoals} of your ${stats.totalGoals} goals are approved.`
                : 'Start by creating your first goal to track progress.'}
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
