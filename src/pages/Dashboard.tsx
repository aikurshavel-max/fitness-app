import { useState, useEffect } from 'react';
import { db } from '../db/database';
import { calculateWaterTarget } from '../utils/calculations';
import WaterTracker from '../components/WaterTracker';
import AIAssistant from '../components/AIAssistant';
import { Utensils } from 'lucide-react';

export default function Dashboard() {
  const [waterTarget, setWaterTarget] = useState(2500);
  const [dailyCalories, setDailyCalories] = useState(0);
  const [targetCalories, setTargetCalories] = useState(2000);
  const [userName, setUserName] = useState('');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    db.userProfile.toArray().then((profiles) => {
      if (profiles.length > 0) {
        const p = profiles[0];
        setUserName(p.name);
        setWaterTarget(calculateWaterTarget(p.currentWeightKg));

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
    });

    db.foodEntries.where('date').equals(today).toArray().then(async (entries) => {
      let total = 0;
      for (const entry of entries) {
        const food = await db.foodItems.get(entry.foodId);
        if (food) {
          total += Math.round((food.caloriesPer100g * entry.grams) / 100);
        }
      }
      setDailyCalories(total);
    });
  }, [today]);

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        {userName ? `Привіт, ${userName}! 👋` : 'Сьогодні'}
      </h1>

      {/* AI-асистент */}
      <AIAssistant />

      {/* Картка калорій */}
      <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Utensils className="text-primary" size={20} />
            <h2 className="font-semibold text-gray-800">Калорії</h2>
          </div>
          <span className="text-sm text-gray-500">
            {dailyCalories} / {targetCalories} ккал
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4">
          <div
            className="bg-primary h-4 rounded-full transition-all duration-300"
            style={{ width: `${Math.min((dailyCalories / targetCalories) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Трекер води */}
      <WaterTracker waterTarget={waterTarget} />
    </div>
  );
}