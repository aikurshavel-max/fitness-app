import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ReferenceLine } from 'recharts';
import { Plus, Trash2 } from 'lucide-react';

export default function Stats() {
  const [weightEntries, setWeightEntries] = useState<any[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [note, setNote] = useState('');
  const [weeklyCaloriesData, setWeeklyCaloriesData] = useState<any[]>([]);
  const [targetCalories, setTargetCalories] = useState(2000);

  const loadWeights = useCallback(async () => {
    const entries = await db.weightEntries.orderBy('date').toArray();
    setWeightEntries(entries);
  }, []);

  const loadWeeklyCalories = useCallback(async () => {
    // Отримуємо цільові калорії з профілю
    const profiles = await db.userProfile.toArray();
    if (profiles.length > 0) {
      const p = profiles[0];
      const activityFactors = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
      };
      const bmr = 10 * p.currentWeightKg + 6.25 * p.heightCm - 5 * (new Date().getFullYear() - p.birthYear) - 161;
      const tdee = Math.round(bmr * activityFactors[p.activityLevel]);
      const target = p.goal === 'lose' ? Math.round(tdee * 0.85) : p.goal === 'gain' ? Math.round(tdee * 1.15) : tdee;
      setTargetCalories(target);
    }

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayMonth = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      days.push({ date: dateStr, label: dayMonth, calories: 0 });
    }

    const entries = await db.foodEntries.toArray();
    for (const entry of entries) {
      const day = days.find((d) => d.date === entry.date);
      if (day) {
        const food = await db.foodItems.get(entry.foodId);
        if (food) {
          day.calories += Math.round((food.caloriesPer100g * entry.grams) / 100);
        }
      }
    }

    const chartData = days.map((d) => ({
      date: d.label,
      Калорії: d.calories,
      Ціль: targetCalories,
    }));
    setWeeklyCaloriesData(chartData);
  }, [targetCalories]);

  useEffect(() => {
    loadWeights();
    loadWeeklyCalories();
  }, [loadWeights, loadWeeklyCalories]);

  const handleAddWeight = async () => {
    const weight = parseFloat(newWeight);
    if (!weight || weight < 30 || weight > 200) {
      alert('Введи коректну вагу (30-200 кг)');
      return;
    }

    await db.weightEntries.add({
      date: new Date().toISOString().split('T')[0],
      weightKg: weight,
      note: note || undefined,
      createdAt: new Date().toISOString(),
    });

    setNewWeight('');
    setNote('');
    await loadWeights();
  };

  const handleDelete = async (id: number) => {
    await db.weightEntries.delete(id);
    await loadWeights();
  };

  const chartData = weightEntries.map((entry) => ({
    date: entry.date,
    weight: entry.weightKg,
  }));

  const currentWeight = weightEntries.length > 0 
    ? weightEntries[weightEntries.length - 1].weightKg 
    : null;

  const weightChange = weightEntries.length > 1
    ? Math.round((weightEntries[weightEntries.length - 1].weightKg - weightEntries[0].weightKg) * 10) / 10
    : null;

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Статистика</h1>

      {/* Поточна вага */}
      {currentWeight && (
        <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Поточна вага</p>
              <p className="text-3xl font-bold text-gray-800">{currentWeight} кг</p>
            </div>
            {weightChange !== null && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Зміна</p>
                <p className={`text-lg font-semibold ${weightChange < 0 ? 'text-green-500' : weightChange > 0 ? 'text-orange-500' : 'text-gray-500'}`}>
                  {weightChange > 0 ? '+' : ''}{weightChange} кг
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Графік калорій за тиждень */}
      <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">Калорії за тиждень</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyCaloriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <ReferenceLine y={targetCalories} stroke="#f472b6" strokeDasharray="3 3" />
            <Bar dataKey="Калорії" fill="#f472b6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Ціль" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Графік ваги */}
      {chartData.length > 1 ? (
        <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">Графік зміни ваги</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="#f472b6" 
                strokeWidth={2}
                dot={{ fill: '#f472b6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md p-8 mb-4 text-center">
          <p className="text-gray-400">Додай щонайменше 2 записи ваги, щоб побачити графік</p>
        </div>
      )}

      {/* Форма додавання ваги */}
      <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">Додати вагу</h2>
        <div className="flex gap-2 mb-2">
          <input
            type="number"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Вага, кг"
            step={0.1}
            min={30}
            max={200}
          />
          <button
            onClick={handleAddWeight}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          placeholder="Нотатка (необов'язково)"
        />
      </div>

      {/* Список записів ваги */}
      <div className="space-y-2">
        {weightEntries.slice().reverse().map((entry) => (
          <div key={entry.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">{entry.weightKg} кг</p>
              <p className="text-xs text-gray-500">{entry.date}</p>
              {entry.note && <p className="text-xs text-gray-400 mt-1">{entry.note}</p>}
            </div>
            <button
              onClick={() => handleDelete(entry.id!)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}