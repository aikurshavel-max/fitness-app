import { useState, useEffect } from 'react';
import { db } from '../db/database';
import { calculateAll, calculateWaterTarget } from '../utils/calculations';
import type { ActivityLevel, Goal } from '../utils/calculations';

interface ProfileProps {
  onProfileSaved?: () => void;
}

export default function Profile({ onProfileSaved }: ProfileProps) {
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState(1990);
  const [heightCm, setHeightCm] = useState(165);
  const [currentWeightKg, setCurrentWeightKg] = useState(70);
  const [goalWeightKg, setGoalWeightKg] = useState(60);
  const [goal, setGoal] = useState<Goal>('lose');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('light');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    db.userProfile.toArray().then((profiles) => {
      if (profiles.length > 0) {
        const p = profiles[0];
        setName(p.name);
        setBirthYear(p.birthYear);
        setHeightCm(p.heightCm);
        setCurrentWeightKg(p.currentWeightKg);
        setGoalWeightKg(p.goalWeightKg);
        setGoal(p.goal);
        setActivityLevel(p.activityLevel);
        setGender(p.gender || 'female');
        setIsSaved(true);
      }
    });
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Будь ласка, введи імʼя');
      return;
    }

    const profile = {
      name: name.trim(),
      birthYear,
      heightCm,
      currentWeightKg,
      goalWeightKg,
      goal,
      activityLevel,
      gender,
      createdAt: new Date().toISOString(),
    };

    await db.userProfile.clear();
    await db.userProfile.add(profile);
    setIsSaved(true);
    if (onProfileSaved) {
      onProfileSaved();
    }
    alert('Профіль збережено! 🎉');
  };

  const calculation = calculateAll({
    birthYear,
    heightCm,
    currentWeightKg,
    goalWeightKg,
    goal,
    activityLevel,
  });

  const waterTarget = calculateWaterTarget(currentWeightKg);

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Профіль</h1>

      {/* Форма */}
      <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
        {/* Ім'я */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Імʼя
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Твоє імʼя"
          />
        </div>

        {/* Стать */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Стать
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="gender"
                value="female"
                checked={gender === 'female'}
                onChange={() => setGender('female')}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span>Жінка</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="gender"
                value="male"
                checked={gender === 'male'}
                onChange={() => setGender('male')}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span>Чоловік</span>
            </label>
          </div>
        </div>

        {/* Рік народження */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Рік народження
          </label>
          <input
            type="number"
            value={birthYear}
            onChange={(e) => setBirthYear(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            min={1940}
            max={2015}
          />
        </div>

        {/* Зріст */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Зріст (см)
          </label>
          <input
            type="number"
            value={heightCm}
            onChange={(e) => setHeightCm(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            min={120}
            max={220}
          />
        </div>

        {/* Поточна вага */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Поточна вага (кг)
          </label>
          <input
            type="number"
            value={currentWeightKg}
            onChange={(e) => setCurrentWeightKg(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            min={30}
            max={200}
            step={0.1}
          />
        </div>

        {/* Цільова вага */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Цільова вага (кг)
          </label>
          <input
            type="number"
            value={goalWeightKg}
            onChange={(e) => setGoalWeightKg(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            min={30}
            max={200}
            step={0.1}
          />
        </div>

        {/* Мета */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Мета
          </label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value as Goal)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="lose">Схуднути</option>
            <option value="maintain">Підтримувати вагу</option>
            <option value="gain">Набрати вагу</option>
          </select>
        </div>

        {/* Рівень активності */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Рівень активності
          </label>
          <select
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="sedentary">Сидячий (майже без тренувань)</option>
            <option value="light">Легкий (1-3 тренування/тиждень)</option>
            <option value="moderate">Помірний (3-5 тренувань/тиждень)</option>
            <option value="active">Активний (6-7 тренувань/тиждень)</option>
          </select>
        </div>

        {/* Кнопка збереження */}
        <button
          onClick={handleSave}
          className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors"
        >
          {isSaved ? 'Оновити профіль' : 'Зберегти профіль'}
        </button>
      </div>

      {/* Результати розрахунку */}
      {isSaved && (
        <div className="mt-6 bg-white rounded-2xl shadow-md p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Твої показники</h2>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-pink-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Вік</p>
              <p className="text-xl font-bold text-gray-800">{calculation.age} років</p>
            </div>
            <div className="bg-pink-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">ІМТ</p>
              <p className="text-xl font-bold text-gray-800">{calculation.bmi}</p>
            </div>
            <div className="bg-pink-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">BMR</p>
              <p className="text-xl font-bold text-gray-800">{calculation.bmr} ккал</p>
            </div>
            <div className="bg-pink-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">TDEE</p>
              <p className="text-xl font-bold text-gray-800">{calculation.tdee} ккал</p>
            </div>
          </div>

          <div className="bg-primary bg-opacity-10 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-500">Цільова норма калорій</p>
            <p className="text-3xl font-bold text-primary-dark">{calculation.targetCalories} ккал</p>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-500">Норма води</p>
            <p className="text-3xl font-bold text-blue-600">{waterTarget} мл</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-3 text-center">Розподіл БЖВ:</p>
            <div className="flex justify-around text-center">
              <div>
                <p className="text-lg font-bold text-orange-500">{calculation.macros.proteinG} г</p>
                <p className="text-xs text-gray-500">Білки</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-500">{calculation.macros.fatG} г</p>
                <p className="text-xs text-gray-500">Жири</p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-500">{calculation.macros.carbsG} г</p>
                <p className="text-xs text-gray-500">Вуглеводи</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}