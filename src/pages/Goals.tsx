import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database';
import { getAchievements } from '../ai/achievements';
import { Plus, Trash2, Target } from 'lucide-react';

type GoalType = 'weight' | 'water' | 'workouts' | 'calories';
type GoalPeriod = 'day' | 'week' | 'total';

const goalTypeLabels: Record<GoalType, string> = {
  weight: 'Вага (кг)',
  water: 'Вода (мл)',
  workouts: 'Тренування',
  calories: 'Калорії (ккал)',
};

const goalTypeIcons: Record<GoalType, string> = {
  weight: '⚖️',
  water: '💧',
  workouts: '🏋️‍♀️',
  calories: '🍽️',
};

const periodLabels: Record<GoalPeriod, string> = {
  day: 'День',
  week: 'Тиждень',
  total: 'За весь час',
};

export default function Goals() {
  const [goals, setGoals] = useState<any[]>([]);
  const [newType, setNewType] = useState<GoalType>('water');
  const [newTarget, setNewTarget] = useState('');
  const [newPeriod, setNewPeriod] = useState<GoalPeriod>('day');
  const [progress, setProgress] = useState<Record<string, { current: number; target: number; percent: number }>>({});
  const [achievements, setAchievements] = useState<any[]>([]);

  const today = new Date().toISOString().split('T')[0];

  const loadGoals = useCallback(async () => {
    const allGoals = await db.userGoals.toArray();
    setGoals(allGoals);
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  useEffect(() => {
    getAchievements().then(setAchievements);
  }, [goals]);

  useEffect(() => {
    const calculateProgress = async () => {
      const progressMap: Record<string, any> = {};
      for (const goal of goals) {
        if (!goal.isActive) continue;
        const targetValue = goal.targetValue;
        let current = 0;
        if (goal.type === 'weight') {
          const weightEntries = await db.weightEntries.orderBy('date').toArray();
          const currentWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weightKg : null;
          if (currentWeight !== null) {
            current = currentWeight;
          }
        } else if (goal.type === 'water') {
          if (goal.period === 'day') {
            const logs = await db.waterLogs.where('date').equals(today).toArray();
            current = logs.reduce((acc, l) => acc + l.amountMl, 0);
          } else if (goal.period === 'week') {
            const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const logs = await db.waterLogs.where('date').between(sevenDaysAgo, today, true, true).toArray();
            current = logs.reduce((acc, l) => acc + l.amountMl, 0);
          } else {
            const logs = await db.waterLogs.toArray();
            current = logs.reduce((acc, l) => acc + l.amountMl, 0);
          }
        } else if (goal.type === 'workouts') {
          if (goal.period === 'day') {
            const logs = await db.workoutLogs.where('date').equals(today).toArray();
            current = logs.length;
          } else if (goal.period === 'week') {
            const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const logs = await db.workoutLogs.where('date').between(sevenDaysAgo, today, true, true).toArray();
            current = logs.length;
          } else {
            const logs = await db.workoutLogs.toArray();
            current = logs.length;
          }
        } else if (goal.type === 'calories') {
          if (goal.period === 'day') {
            const entries = await db.foodEntries.where('date').equals(today).toArray();
            for (const entry of entries) {
              const food = await db.foodItems.get(entry.foodId);
              if (food) current += Math.round((food.caloriesPer100g * entry.grams) / 100);
            }
          } else if (goal.period === 'week') {
            const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const entries = await db.foodEntries.where('date').between(sevenDaysAgo, today, true, true).toArray();
            for (const entry of entries) {
              const food = await db.foodItems.get(entry.foodId);
              if (food) current += Math.round((food.caloriesPer100g * entry.grams) / 100);
            }
          } else {
            const entries = await db.foodEntries.toArray();
            for (const entry of entries) {
              const food = await db.foodItems.get(entry.foodId);
              if (food) current += Math.round((food.caloriesPer100g * entry.grams) / 100);
            }
          }
        }

        let percent = 0;
        if (goal.type === 'weight') {
          const weightEntries = await db.weightEntries.orderBy('date').toArray();
          const initialWeight = weightEntries.length > 0 ? weightEntries[0].weightKg : null;
          const currentWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weightKg : null;
          if (initialWeight !== null && currentWeight !== null) {
            const totalDiff = targetValue - initialWeight;
            const currentDiff = currentWeight - initialWeight;
            if (totalDiff !== 0) {
              percent = Math.max(0, Math.min(100, (currentDiff / totalDiff) * 100));
            }
          }
        } else {
          percent = targetValue > 0 ? Math.min((current / targetValue) * 100, 100) : 0;
        }

        progressMap[goal.id!] = { current, target: targetValue, percent: Math.round(percent) };
      }
      setProgress(progressMap);
    };
    if (goals.length > 0) calculateProgress();
  }, [goals, today]);

  const handleAddGoal = async () => {
    const target = parseFloat(newTarget);
    if (!target || target <= 0) {
      alert('Введи коректне значення цілі');
      return;
    }
    await db.userGoals.add({
      type: newType,
      targetValue: target,
      period: newPeriod,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    setNewTarget('');
    await loadGoals();
  };

  const handleDelete = async (id: number) => {
    await db.userGoals.delete(id);
    await loadGoals();
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    await db.userGoals.update(id, { isActive: !isActive });
    await loadGoals();
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Цілі</h1>

      {/* Форма додавання */}
      <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">Нова ціль</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тип цілі</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as GoalType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(goalTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>{goalTypeIcons[key as GoalType]} {label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Цільове значення</label>
            <input
              type="number"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Наприклад, 2000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Період</label>
            <select
              value={newPeriod}
              onChange={(e) => setNewPeriod(e.target.value as GoalPeriod)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(periodLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAddGoal}
            className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Додати ціль
          </button>
        </div>
      </div>

      {/* Список цілей */}
      <div className="space-y-2">
        {goals.map((goal) => {
          const prog = progress[goal.id!] || { current: 0, target: goal.targetValue, percent: 0 };
          const icon = goalTypeIcons[goal.type as GoalType] || '🎯';
          const typeLabel = goalTypeLabels[goal.type as GoalType] || goal.type;
          return (
            <div key={goal.id} className={`bg-white rounded-xl shadow-sm p-3 ${goal.isActive ? '' : 'opacity-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <p className="font-medium text-gray-800">{typeLabel}: {goal.targetValue}</p>
                    <p className="text-xs text-gray-500">Період: {periodLabels[goal.period as GoalPeriod]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(goal.id!, goal.isActive)}
                    className={`text-xs px-2 py-1 rounded ${goal.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {goal.isActive ? 'Активна' : 'Неактивна'}
                  </button>
                  <button
                    onClick={() => handleDelete(goal.id!)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {goal.type !== 'weight' ? (
                <div className="mb-1">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Прогрес: {prog.current} / {prog.target}</span>
                    <span>{prog.percent}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${prog.percent}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  Поточна вага: {prog.current} кг (ціль: {prog.target} кг)
                </div>
              )}
            </div>
          );
        })}
        {goals.length === 0 && (
          <div className="text-center py-8">
            <Target size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">Ще немає цілей</p>
            <p className="text-gray-300 text-sm mt-1">Додай свою першу ціль!</p>
          </div>
        )}
      </div>

      {/* Досягнення */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Досягнення</h2>
        <div className="grid grid-cols-2 gap-2">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`rounded-xl p-3 text-center ${ach.earned ? 'bg-gradient-to-br from-yellow-50 to-amber-100 border border-yellow-300' : 'bg-white border border-gray-200 opacity-60'}`}
            >
              <span className="text-2xl block">{ach.icon}</span>
              <p className="text-sm font-medium text-gray-800 mt-1">{ach.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{ach.description}</p>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{ach.progress}/{ach.target}</span>
                  <span>{Math.round((ach.progress / ach.target) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${ach.earned ? 'bg-yellow-400' : 'bg-gray-300'}`}
                    style={{ width: `${(ach.progress / ach.target) * 100}%` }}
                  />
                </div>
              </div>
              {ach.earned && <span className="text-xs text-green-600 mt-1 block">✅ Отримано!</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}