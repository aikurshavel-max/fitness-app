import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database';
import { searchFoods } from '../data/foodDatabase';
import type { LocalFoodProduct } from '../data/foodDatabase';
import { analyzeFoodImage } from '../ai/foodRecognition';
import type { RecognizedFood } from '../ai/foodRecognition';
import { Search, Plus, X, Trash2, Camera, Loader2, AlertTriangle } from 'lucide-react';

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

  // Состояния для распознавания
  const [showRecognition, setShowRecognition] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recognizedFood, setRecognizedFood] = useState<RecognizedFood | null>(null);
  const [recognitionError, setRecognitionError] = useState('');
  const [recognitionGrams, setRecognitionGrams] = useState(100);

  const today = new Date().toISOString().split('T')[0];

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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      setSearchResults(searchFoods(query).slice(0, 20));
    } else {
      setSearchResults([]);
    }
  };

  const handleAddFood = async () => {
    if (!selectedFood) return;

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

    setSelectedFood(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
    setGrams(100);
    await loadEntries();
  };

  const handleDelete = async (id: number) => {
    await db.foodEntries.delete(id);
    await loadEntries();
  };

  // ====== РАСПОЗНАВАНИЕ ======
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setRecognitionError('');
    setRecognizedFood(null);

    try {
      // Сжимаем изображение перед отправкой
      const compressed = await compressImage(file);
      const result = await analyzeFoodImage(compressed);
      setRecognizedFood(result);
    } catch (error: any) {
      setRecognitionError(error.message || 'Помилка розпізнавання');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 800;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Помилка стиснення'));
          }, 'image/jpeg', 0.8);
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAddRecognizedFood = async () => {
    if (!recognizedFood) return;
    try {
      let existingFood = await db.foodItems.where('name').equals(recognizedFood.name).first();

      if (!existingFood) {
        const newFoodId = await db.foodItems.add({
          name: recognizedFood.name,
          caloriesPer100g: recognizedFood.calories,
          proteinPer100g: recognizedFood.protein,
          fatPer100g: recognizedFood.fat,
          carbsPer100g: recognizedFood.carbs,
          source: 'manual',
        });
        existingFood = await db.foodItems.get(newFoodId);
      }

      if (existingFood?.id) {
        await db.foodEntries.add({
          date: today,
          meal: selectedMeal,
          foodId: existingFood.id,
          grams: recognitionGrams,
          createdAt: new Date().toISOString(),
        });
      }

      // Сброс состояний
      setShowRecognition(false);
      setRecognizedFood(null);
      setRecognitionError('');
      setRecognitionGrams(100);
      await loadEntries();
    } catch (error) {
      console.error('Помилка додавання розпізнаної їжі:', error);
      alert('Не вдалося додати страву. Спробуй ще раз.');
    }
  };

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

      {/* Кнопки добавления */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowSearch(true)}
          className="flex-1 bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Додати їжу
        </button>
        <button
          onClick={() => setShowRecognition(true)}
          className="flex-1 bg-green-500 text-white py-3 rounded-xl font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
        >
          <Camera size={20} />
          Розпізнати
        </button>
      </div>

      {/* Модальное окно ручного добавления */}
      {showSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
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

            <div className="flex-1 overflow-y-auto p-4">
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

      {/* Модальное окно распознавания */}
      {showRecognition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Розпізнати їжу</h2>
              <button onClick={() => setShowRecognition(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!recognizedFood && !isAnalyzing && (
                <div className="text-center">
                  <Camera size={48} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">Сфотографуй страву або обери фото</p>
                  <label
                    htmlFor="food-photo-input"
                    className="bg-green-500 text-white py-3 px-4 rounded-xl font-medium hover:bg-green-600 transition-colors cursor-pointer inline-block"
                  >
                    📸 Зробити фото
                  </label>
                  <input
                    id="food-photo-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              )}

              {isAnalyzing && (
                <div className="text-center py-8">
                  <Loader2 size={48} className="text-green-500 mx-auto mb-3 animate-spin" />
                  <p className="text-gray-600">Аналізую фото...</p>
                  <p className="text-gray-400 text-sm mt-1">Це може зайняти кілька секунд</p>
                </div>
              )}

              {recognitionError && (
                <div className="text-center py-8">
                  <AlertTriangle size={48} className="text-red-400 mx-auto mb-3" />
                  <p className="text-red-500">{recognitionError}</p>
                  <button
                    onClick={() => setRecognitionError('')}
                    className="mt-3 text-blue-500 underline"
                  >
                    Спробувати ще раз
                  </button>
                </div>
              )}

              {recognizedFood && !isAnalyzing && (
                <div>
                  <div className="bg-gray-50 rounded-xl p-4 mb-3">
                    <p className="text-xl font-bold text-gray-800">{recognizedFood.name}</p>
                    <div className="flex justify-between mt-2 text-sm">
                      <span>Калорії: {recognizedFood.calories} ккал/100г</span>
                      <span>Впевненість: {Math.round(recognizedFood.confidence * 100)}%</span>
                    </div>
                    <div className="flex justify-around mt-3 text-center">
                      <div>
                        <p className="font-semibold text-orange-500">{recognizedFood.protein} г</p>
                        <p className="text-xs text-gray-500">Білки</p>
                      </div>
                      <div>
                        <p className="font-semibold text-green-500">{recognizedFood.fat} г</p>
                        <p className="text-xs text-gray-500">Жири</p>
                      </div>
                      <div>
                        <p className="font-semibold text-blue-500">{recognizedFood.carbs} г</p>
                        <p className="text-xs text-gray-500">Вуглеводи</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-gray-600">
                        Оцінка корисності: {recognizedFood.healthScore}/10
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full ${
                            recognizedFood.healthScore >= 7 ? 'bg-green-500' :
                            recognizedFood.healthScore >= 4 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${recognizedFood.healthScore * 10}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700">
                        Рекомендація: {' '}
                        {recognizedFood.recommendation === 'можна' ? '✅ Можна їсти' :
                         recognizedFood.recommendation === 'помірно' ? '⚠️ Їсти помірно' :
                         '🚫 Краще обмежити'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-gray-600">Вага порції (г):</span>
                    <input
                      type="number"
                      value={recognitionGrams}
                      onChange={(e) => setRecognitionGrams(Number(e.target.value))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center"
                      min={1}
                      max={2000}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setRecognizedFood(null);
                        setRecognitionError('');
                      }}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                    >
                      Скасувати
                    </button>
                    <button
                      onClick={handleAddRecognizedFood}
                      className="flex-1 bg-green-500 text-white py-3 rounded-xl font-medium hover:bg-green-600 transition-colors"
                    >
                      Додати до {mealLabels[selectedMeal].toLowerCase()}
                    </button>
                  </div>
                </div>
              )}
            </div>
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