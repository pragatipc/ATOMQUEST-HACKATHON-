'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Goal {
  _id: string;
  title: string;
  status: string;
  weightage: number;
  target: number | string;
  uomType: string;
}

export default function GoalsPage() {
  const { data: session } = useSession();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalWeightage, setTotalWeightage] = useState(0);

  useEffect(() => {
    async function fetchGoals() {
      try {
        const res = await fetch(`/api/goals?employeeId=${session?.user?.id}`);
        const data = await res.json();
        setGoals(data);
        const total = data.reduce((sum: number, g: Goal) => sum + g.weightage, 0);
        setTotalWeightage(total);
      } catch (error) {
        console.error('Error fetching goals:', error);
      } finally {
        setLoading(false);
      }
    }

    if (session?.user?.id) {
      fetchGoals();
    }
  }, [session?.user?.id]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rework: 'bg-red-100 text-red-800',
      locked: 'bg-purple-100 text-purple-800',
    };
    return styles[status] || styles.draft;
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Goals</h1>
        <Link
          href="/goals/new"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
        >
          Create New Goal
        </Link>
      </div>

      {/* Weightage Indicator */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Total Weightage</h2>
          <span className={`text-2xl font-bold ${totalWeightage === 100 ? 'text-green-600' : totalWeightage > 100 ? 'text-red-600' : 'text-yellow-600'}`}>
            {totalWeightage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              totalWeightage === 100 ? 'bg-green-600' : totalWeightage > 100 ? 'bg-red-600' : 'bg-yellow-600'
            }`}
            style={{ width: `${Math.min(totalWeightage, 100)}%` }}
          ></div>
        </div>
        {totalWeightage < 100 && (
          <p className="text-sm text-gray-600 mt-3">
            Remaining: <span className="font-semibold">{100 - totalWeightage}%</span>
          </p>
        )}
        {totalWeightage > 100 && (
          <p className="text-sm text-red-600 mt-3">
            ⚠️ Weightage exceeds 100%. Please adjust your goals.
          </p>
        )}
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg mb-4">No goals yet. Create your first goal!</p>
          <Link
            href="/employee-goals/new"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
          >
            Create Goal
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Target
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Weightage
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {goals.map((goal) => (
                <tr key={goal._id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{goal.title}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{goal.target}</td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">{goal.weightage}%</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                        goal.status
                      )}`}
                    >
                      {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/goals/${goal._id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
