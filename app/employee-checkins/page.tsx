'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { computeScore } from '@/lib/scoring';

interface Goal {
  _id: string;
  title: string;
  target: number | Date;
  uomType: string;
  weightage: number;
}

interface Achievement {
  _id: string;
  goalId: Goal;
  actualValue: number | Date;
  progressStatus: 'not_started' | 'on_track' | 'completed';
  computedScore: number;
}

export default function CheckInsPage() {
  const { data: session } = useSession();
  const [quarter, setQuarter] = useState('Q1');
  const [year, setYear] = useState(new Date().getFullYear());
  const [goals, setGoals] = useState<Goal[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchData();
  }, [quarter, year, session?.user?.id]);

  async function fetchData() {
    try {
      setLoading(true);
      const [goalsRes, achievementsRes] = await Promise.all([
        fetch(`/api/goals?employeeId=${session?.user?.id}`),
        fetch(
          `/api/achievements?employeeId=${session?.user?.id}&quarter=${quarter}&year=${year}`
        ),
      ]);

      const goalsData = await goalsRes.json();
      const achievementsData = await achievementsRes.json();

      setGoals(goalsData.filter((g: Goal) => g._id)); // Filter locked goals only
      setAchievements(achievementsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleAchievementChange = (
    goalId: string,
    field: string,
    value: any
  ) => {
    setAchievements((prev) => {
      const existing = prev.find((a) => a.goalId._id === goalId);
      if (existing) {
        return prev.map((a) =>
          a.goalId._id === goalId ? { ...a, [field]: value } : a
        );
      } else {
        return [
          ...prev,
          {
            _id: Math.random().toString(),
            goalId: goals.find((g) => g._id === goalId)!,
            actualValue: field === 'actualValue' ? value : 0,
            progressStatus: field === 'progressStatus' ? value : 'on_track',
            computedScore: 0,
          },
        ];
      }
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSuccess('');

      await Promise.all(
        achievements.map((achievement) =>
          fetch('/api/achievements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              goalId: achievement.goalId._id,
              quarter,
              year,
              actualValue: achievement.actualValue,
              progressStatus: achievement.progressStatus,
            }),
          })
        )
      );

      setSuccess('Check-ins saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving achievements:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Check-Ins</h1>

      {/* Quarter & Year Selector */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex gap-6 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quarter</label>
            <select
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value={currentYear - 1}>{currentYear - 1}</option>
              <option value={currentYear}>{currentYear}</option>
              <option value={currentYear + 1}>{currentYear + 1}</option>
            </select>
          </div>
        </div>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">{success}</p>
        </div>
      )}

      {/* Achievements Table */}
      {goals.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg">No locked goals to track for this period.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Goal
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Target
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Actual Value
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {goals.map((goal) => {
                  const achievement = achievements.find((a) => a.goalId._id === goal._id);
                  const score =
                    achievement && achievement.actualValue
                      ? computeScore(goal as any, achievement.actualValue)
                      : 0;

                  return (
                    <tr key={goal._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{goal.title}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{String(goal.target)}</td>
                      <td className="px-6 py-4">
                        <input
                          type={goal.uomType === 'timeline' ? 'date' : 'number'}
                          value={achievement?.actualValue != null ? String(achievement.actualValue) : ''}
                          onChange={(e) =>
                            handleAchievementChange(
                              goal._id,
                              'actualValue',
                              goal.uomType === 'timeline'
                                ? e.target.value
                                : parseFloat(e.target.value) || 0
                            )
                          }
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="Enter actual value"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={achievement?.progressStatus || 'on_track'}
                          onChange={(e) =>
                            handleAchievementChange(goal._id, 'progressStatus', e.target.value)
                          }
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                          <option value="not_started">Not Started</option>
                          <option value="on_track">On Track</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold text-purple-600">{Math.round(score)}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
            >
              {saving ? 'Saving...' : 'Save Check-in'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
