import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database';
import { calculateWaterTarget } from '../utils/calculations';
import WaterTracker from '../components/WaterTracker';
import AIAssistant from '../components/AIAssistant';
import { Utensils, Zap, X, Flame } from 'lucide-react';

type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const mealLabels: Record<Meal, string> = {
  breakfast: 'Сніданок',
  lunch: 'Обід',
  dinner: 'Вечеря',
  snack: 'Перекус',
};

const mealIcons: Record<Meal, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

interface FrequentFood {
  food: {
    id: number;
    name: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    fatPer100g: number;
    carbsPer100g: number;
  };
  count: number;
}

export default function Dashboard() {
  const [waterTarget, setWaterTarget] = useState(2500);
  const [dailyCalories, setDailyCalories] = useState(0);
  const [targetCalories, setTargetCalories] = useState(2000);
  const [userName, setUserName] = useState('');
  const [frequentFoods, setFrequentFoods] = useState<FrequentFood[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickFood, setQuickFood] = useState<FrequentFood['food'] | null>(null);
  const [quickGrams, setQuickGrams] = useState(100);
  const [quickMeal, setQuickMeal] = useState<Meal>('breakfast');
  const [streak, setStreak] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  const loadDailyCalories = useCallback(async () => {
    const entries = await db.foodEntries.where('date').equals(today).toArray();
    let total = 0;
    for (const entry of entries) {
      const food = await db.foodItems.get(entry.foodId);
      if (food) {
        total += Math.round((food.caloriesPer100g * entry.grams) / 100);
      }
    }
    setDailyCalories(total);
  }, [today]);

  const loadFrequentFoods = useCallback(async () => {
    const entries = await db.foodEntries.toArray();
    const countMap: Record<number, number> = {};
    entries.forEach((entry) => {
      countMap[entry.foodId] = (countMap[entry.foodId] || 0) + 1;
    });

    const sorted = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const frequent: FrequentFood[] = [];
    for (const [foodIdStr, count] of sorted) {
      const foodId = Number(foodIdStr);
      const food = await db.foodItems.get(foodId);
      if (food) {
        frequent.push({
          food: {
            id: food.id!,
            name: food.name,
            caloriesPer100g: food.caloriesPer100g,
            proteinPer100g: food.proteinPer100g,
            fatPer100g: food.fatPer100g,
            carbsPer100g: food.carbsPer100g,
          },
          count,
        });
      }
    }
    setFrequentFoods(frequent);
  }, []);

  // Розрахунок серії днів
  const calculateStreak = useCallback(async () => {
    // Отримуємо всі унікальні дати, коли була активність
    const activeDates = new Set<string>();

    const foodDates = await db.foodEntries.toArray();
    foodDates.forEach((e) => activeDates.add(e.date));

    const waterDates = await db.waterLogs.toArray();
    waterDates.forEach((e) => activeDates.add(e.date));

    const workoutDates = await db.workoutLogs.toArray();
    workoutDates.forEach((e) => activeDates.add(e.date));

    // Перевіряємо підряд дні до сьогодні або до останнього активного дня
    let streak = 0;
    let currentDate = new Date();
    // Якщо сьогодні є активність, рахуємо з сьогодні
    const todayStr = currentDate.toISOString().split('T')[0];
    if (activeDates.has(todayStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      // Якщо сьогодні ще немає, рахуємо з вчора (серія не зламана, але сьогодні ще не враховано)
      currentDate.setDate(currentDate.getDate() - 1);
      const yesterdayStr = currentDate.toISOString().split('T')[0];
      if (activeDates.has(yesterdayStr)) {
        streak++;
      } else {
        // Якщо ні сьогодні, ні вчора немає — серія 0
        setStreak(0);
        return;
      }
    }

    // Продовжуємо назад
    while (true) {
      currentDate.setDate(currentDate.getDate() - 1);
      const dateStr = currentDate.toISOString().split('T')[0];
      if (activeDates.has(dateStr)) {
        streak++;
      } else {
        break;
      }
    }

    setStreak(streak);
  }, []);

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

    loadDailyCalories();
    loadFrequentFoods();
    calculateStreak();
  }, [loadDailyCalories, loadFrequentFoods, calculateStreak]);

  const handleQuickAdd = async () => {
    if (!quickFood) return;
    await db.foodEntries.add({
      date: today,
      meal: quickMeal,
      foodId: quickFood.id,
      grams: quickGrams,
      createdAt: new Date().toISOString(),
    });

    setShowQuickAdd(false);
    setQuickFood(null);
    setQuickGrams(100);
    await loadDailyCalories();
    await loadFrequentFoods();
    await calculateStreak();
  };

  const openQuickAdd = (food: FrequentFood['food']) => {
    setQuickFood(food);
    setQuickGrams(100);
    setQuickMeal('breakfast');
    setShowQuickAdd(true);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        {userName ? `Привіт, ${userName}! 👋` : 'Сьогодні'}
      </h1>

      {/* Серія днів */}
      <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-2xl shadow-sm p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flame size={32} className={streak > 0 ? 'text-orange-500' : 'text-gray-400'} />
          <div>
            <p className="text-sm text-gray-600">Серія днів</p>
            <p className="text-2xl font-bold text-orange-600">{streak} {streak === 1 ? 'день' : 'днів'}</p>
          </div>
        </div>
        {streak >= 7 && <span className="text-2xl">🏆</span>}
      </div>

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

      {/* Часті продукти */}
      {frequentFoods.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={18} className="text-yellow-500" />
            <h2 className="font-semibold text-gray-800">Часті продукти</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {frequentFoods.map(({ food, count }) => (
              <button
                key={food.id}
                onClick={() => openQuickAdd(food)}
                className="flex-shrink-0 bg-white rounded-xl shadow-sm p-3 text-left hover:bg-pink-50 transition-colors"
                style={{ minWidth: '120px' }}
              >
                <p className="text-sm font-medium text-gray-800 truncate">{food.name}</p>
                <p className="text-xs text-gray-500">{food.caloriesPer100g} ккал/100г</p>
                <p className="text-xs text-gray-400 mt-1">×{count}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Трекер води */}
      <WaterTracker waterTarget={waterTarget} />

      {/* Швидке додавання */}
      {showQuickAdd && quickFood && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">{quickFood.name}</h3>
              <button onClick={() => setShowQuickAdd(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Прийом їжі</label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(mealLabels) as Meal[]).map((meal) => (
                  <button
                    key={meal}
                    onClick={() => setQuickMeal(meal)}
                    className={`p-2 rounded-lg text-center transition-colors ${
                      quickMeal === meal
                        ? 'bg-primary text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-pink-50'
                    }`}
                  >
                    <span className="text-lg">{mealIcons[meal]}</span>
                    <span className="text-xs block">{mealLabels[meal]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Вага (г)</label>
              <input
                type="number"
                value={quickGrams}
                onChange={(e) => setQuickGrams(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                min={1}
                max={1000}
              />
            </div>

            <div className="text-sm text-gray-600 mb-3">
              {(quickFood.caloriesPer100g * quickGrams / 100).toFixed(0)} ккал
            </div>

            <button
              onClick={handleQuickAdd}
              className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors"
            >
              Додати
            </button>
          </div>
        </div>
      )}
    </div>
  );
}