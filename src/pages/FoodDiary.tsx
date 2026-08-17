import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database';
import { searchFoods } from '../data/foodDatabase';
import type { LocalFoodProduct } from '../data/foodDatabase';
import { Search, Plus, X, Trash2 } from 'lucide-react';

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

interface DiaryEntry {
  id: number;
  meal: Meal;
  foodName: string;
  grams: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export default function FoodDiary() {
  const [selectedMeal, setSelectedMeal] = useState<Meal>('breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocalFoodProduct[]>([]);
  const [selectedFood, setSelectedFood] = useState<LocalFoodProduct | null>(null);
  const [grams, setGrams] = useState(100);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Завантаження записів за сьогодні
  const loadEntries = useCallback(async () => {
    const allEntries = await db.foodEntries.where('date').equals(today).toArray();
    const diaryEntries: DiaryEntry[] = [];

    for (const entry of allEntries) {
      const food = await db.foodItems.get(entry.foodId);
      if (food) {
        diaryEntries.push({
          id: entry.id!,
          meal: entry.meal as Meal,
          foodName: food.name,
          grams: entry.grams,
          calories: Math.round((food.caloriesPer100g * entry.grams) / 100),
          protein: Math.round((food.proteinPer100g * entry.grams) / 100 * 10) / 10,
          fat: Math.round((food.fatPer100g * entry.grams) / 100 * 10) / 10,
          carbs: Math.round((food.carbsPer100g * entry.grams) / 100 * 10) / 10,
        });
      }
    }

    setEntries(diaryEntries);
  }, [today]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Пошук їжі
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      setSearchResults(searchFoods(query).slice(0, 20));
    } else {
      setSearchResults([]);
    }
  };

  // Додавання їжі
  const handleAddFood = async () => {
    if (!selectedFood) return;

    // Перевіряємо, чи є продукт у базі
    let existingFood = await db.foodItems.where('name').equals(selectedFood.name).first();

    if (!existingFood) {
      const newFoodId = await db.foodItems.add({
        name: selectedFood.name,
        caloriesPer100g: selectedFood.calories,
        proteinPer100g: selectedFood.protein,
        fatPer100g: selectedFood.fat,
        carbsPer100g: selectedFood.carbs,
        source: 'local',
      });
      existingFood = await db.foodItems.get(newFoodId);
    }

    if (existingFood?.id) {
      await db.foodEntries.add({
        date: today,
        meal: selectedMeal,
        foodId: existingFood.id,
        grams,
        createdAt: new Date().toISOString(),
      });
    }

    // Очищення форми
    setSelectedFood(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
    setGrams(100);

    // Оновлення списку
    await loadEntries();
  };

  // Видалення запису
  const handleDelete = async (id: number) => {
    await db.foodEntries.delete(id);
    await loadEntries();
  };

  // Підрахунок сум
  const totals = entries.reduce(
    (acc, entry) => {
      acc.calories += entry.calories;
      acc.protein += entry.protein;
      acc.fat += entry.fat;
      acc.carbs += entry.carbs;
      return acc;
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Щоденник харчування</h1>

      {/* Підсумок дня */}
      <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
        <div className="text-center mb-3">
          <p className="text-sm text-gray-500">Калорії за день</p>
          <p className="text-3xl font-bold text-primary-dark">{totals.calories} ккал</p>
        </div>
        <div className="flex justify-around text-center text-sm">
          <div>
            <p className="font-semibold text-orange-500">{Math.round(totals.protein)} г</p>
            <p className="text-gray-500 text-xs">Білки</p>
          </div>
          <div>
            <p className="font-semibold text-green-500">{Math.round(totals.fat)} г</p>
            <p className="text-gray-500 text-xs">Жири</p>
          </div>
          <div>
            <p className="font-semibold text-blue-500">{Math.round(totals.carbs)} г</p>
            <p className="text-gray-500 text-xs">Вуглеводи</p>
          </div>
        </div>
      </div>

      {/* Вибір прийому їжі */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {(Object.keys(mealLabels) as Meal[]).map((meal) => (
          <button
            key={meal}
            onClick={() => setSelectedMeal(meal)}
            className={`p-2 rounded-xl text-center transition-colors ${
              selectedMeal === meal
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 hover:bg-pink-50'
            }`}
          >
            <span className="text-lg block">{mealIcons[meal]}</span>
            <span className="text-xs">{mealLabels[meal]}</span>
          </button>
        ))}
      </div>

      {/* Кнопка додавання */}
      <button
        onClick={() => setShowSearch(true)}
        className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Додати їжу
      </button>

      {/* Модальне вікно пошуку */}
      {showSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-2xl w-full max-w-md max-h-[60vh] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800">Додати їжу</h2>
                <button
                  onClick={() => setShowSearch(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Пошук продукту..."
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: '100px' }}>
              {searchResults.length > 0 ? (
                searchResults.map((food) => (
                  <button
                    key={food.name}
                    onClick={() => setSelectedFood(food)}
                    className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                      selectedFood?.name === food.name
                        ? 'bg-primary bg-opacity-10 border border-primary'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">{food.name}</span>
                      <span className="text-sm text-gray-500">{food.calories} ккал/100г</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Б: {food.protein}г | Ж: {food.fat}г | В: {food.carbs}г
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">
                  {searchQuery ? 'Нічого не знайдено' : 'Введи назву продукту'}
                </p>
              )}
            </div>

            {selectedFood && (
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{selectedFood.name}</p>
                    <p className="text-xs text-gray-500">
                      {selectedFood.calories} ккал/100г
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={grams}
                      onChange={(e) => setGrams(Number(e.target.value))}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center"
                      min={1}
                      max={1000}
                    />
                    <span className="text-gray-500">г</span>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-3 text-center">
                  <p>
                    {(selectedFood.calories * grams / 100).toFixed(0)} ккал | 
                    Б: {(selectedFood.protein * grams / 100).toFixed(1)}г | 
                    Ж: {(selectedFood.fat * grams / 100).toFixed(1)}г | 
                    В: {(selectedFood.carbs * grams / 100).toFixed(1)}г
                  </p>
                </div>
                <button
                  onClick={handleAddFood}
                  className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors"
                >
                  Додати до {mealLabels[selectedMeal].toLowerCase()}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Список записів */}
      <div className="mt-4 space-y-2">
        {(Object.keys(mealLabels) as Meal[]).map((meal) => {
          const mealEntries = entries.filter((e) => e.meal === meal);
          if (mealEntries.length === 0) return null;
          
          return (
            <div key={meal} className="bg-white rounded-2xl shadow-sm p-4">
              <h3 className="font-medium text-gray-700 mb-2">
                {mealIcons[meal]} {mealLabels[meal]}
              </h3>
              {mealEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{entry.foodName}</p>
                    <p className="text-xs text-gray-500">{entry.grams} г</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{entry.calories} ккал</span>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}