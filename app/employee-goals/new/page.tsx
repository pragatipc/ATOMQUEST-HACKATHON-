'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Goal {
  _id: string;
  weightage: number;
}

export default function NewGoalPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState({
    thrustArea: '',
    title: '',
    description: '',
    uomType: 'numeric_min',
    target: '',
    weightage: 20,
  });

  const [existingGoals, setExistingGoals] = useState<Goal[]>([]);
  const [totalWeightage, setTotalWeightage] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingGoals, setFetchingGoals] = useState(true);

  useEffect(() => {
    async function fetchExistingGoals() {
      try {
        const res = await fetch(`/api/goals?employeeId=${session?.user?.id}`);
        const data = await res.json();
        setExistingGoals(data);
        const total = data.reduce((sum: number, g: Goal) => sum + g.weightage, 0);
        setTotalWeightage(total);
      } catch (error) {
        console.error('Error fetching goals:', error);
      } finally {
        setFetchingGoals(false);
      }
    }

    if (session?.user?.id) {
      fetchExistingGoals();
    }
  }, [session?.user?.id]);

  const remainingWeightage = 100 - totalWeightage;
  const projectedTotal = totalWeightage + formData.weightage;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'weightage' ? parseInt(value) || 0 : value,
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.thrustArea || !formData.title || !formData.description || !formData.target) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (formData.weightage < 10 || formData.weightage > 100) {
      setError('Weightage must be between 10 and 100');
      setLoading(false);
      return;
    }

    if (projectedTotal > 100) {
      setError(`Total weightage would be ${projectedTotal}%. Maximum is 100%.`);
      setLoading(false);
      return;
    }

    if (existingGoals.length >= 8) {
      setError('Maximum 8 goals per employee reached');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to create goal');
        return;
      }

      router.push('/goals');
    } catch (error) {
      setError('An error occurred. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingGoals) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Goal</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8 space-y-6">
        {/* Thrust Area */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Thrust Area <span className="text-red-600">*</span>
          </label>
          <select
            name="thrustArea"
            value={formData.thrustArea}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            required
          >
            <option value="">Select a thrust area</option>
            <option value="Business Growth">Business Growth</option>
            <option value="Customer Experience">Customer Experience</option>
            <option value="Operational Efficiency">Operational Efficiency</option>
            <option value="Team Development">Team Development</option>
            <option value="Innovation">Innovation</option>
            <option value="Quality">Quality</option>
            <option value="Cost Reduction">Cost Reduction</option>
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Goal Title <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., Increase Sales by 20%"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Description <span className="text-red-600">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the goal and its importance"
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            required
          />
        </div>

        {/* UoM Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Type of Measurement <span className="text-red-600">*</span>
          </label>
          <select
            name="uomType"
            value={formData.uomType}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            required
          >
            <option value="numeric_min">Numeric - Higher is Better</option>
            <option value="numeric_max">Numeric - Lower is Better</option>
            <option value="timeline">Timeline - Complete by Date</option>
            <option value="zero">Zero - Target is Zero</option>
          </select>
        </div>

        {/* Target */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Target <span className="text-red-600">*</span>
          </label>
          <input
            type={formData.uomType === 'timeline' ? 'date' : 'number'}
            name="target"
            value={formData.target}
            onChange={handleChange}
            placeholder={formData.uomType === 'timeline' ? 'Select target date' : 'Enter target value'}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            required
          />
        </div>

        {/* Weightage */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Weightage <span className="text-red-600">*</span>
          </label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              name="weightage"
              value={formData.weightage}
              onChange={handleChange}
              min="10"
              max="100"
              step="5"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
            <span className="text-2xl font-bold text-gray-900">{formData.weightage}%</span>
          </div>
        </div>

        {/* Weightage Indicator */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Existing Goals Weightage:</span>
              <span className="font-semibold text-gray-900">{totalWeightage}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">This Goal:</span>
              <span className="font-semibold text-gray-900">{formData.weightage}%</span>
            </div>
            <div className="border-t border-blue-200 pt-3 flex justify-between text-sm">
              <span className="font-semibold text-gray-900">Projected Total:</span>
              <span
                className={`font-bold text-lg ${
                  projectedTotal === 100
                    ? 'text-green-600'
                    : projectedTotal > 100
                    ? 'text-red-600'
                    : 'text-yellow-600'
                }`}
              >
                {projectedTotal}%
              </span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading || projectedTotal > 100}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
          >
            {loading ? 'Creating...' : 'Create Goal'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
