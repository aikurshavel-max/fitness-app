import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database';
import type { WorkoutLog } from '../db/database';
import { Dumbbell, Trash2, Plus, Flame } from 'lucide-react';

type WorkoutType = 'walking' | 'running' | 'strength' | 'yoga' | 'cycling' | 'exercise' | 'fitness' | 'other';

interface WorkoutTypeConfig {
  type: WorkoutType;
  label: string;
  icon: string;
  usesSteps?: boolean;
  usesDistance?: boolean;
  usesPace?: boolean;
  usesIntensity?: boolean;
  metBase?: number;           // для типів з часом та інтенсивністю
  intensityFactors?: { light: number; moderate: number; high: number }; // множники для інтенсивності
  paceMets?: { slow: number; medium: number; fast: number }; // для бігу
  metBySpeed?: (speedKmh: number) => number; // для велосипеда та бігу (якщо не використовуємо pace)
}

const workoutTypes: WorkoutTypeConfig[] = [
  {
    type: 'walking',
    label: 'Ходьба',
    icon: '🚶‍♀️',
    usesSteps: true,
    metBase: 3.5,
  },
  {
    type: 'running',
    label: 'Біг',
    icon: '🏃‍♀️',
    usesDistance: true,
    usesPace: true,
    paceMets: { slow: 6, medium: 9, fast: 11 },
  },
  {
    type: 'cycling',
    label: 'Велосипед',
    icon: '🚴‍♀️',
    usesDistance: true,
    metBySpeed: (speed) => {
      if (speed < 15) return 4;
      if (speed < 20) return 6;
      if (speed < 25) return 8;
      return 10;
    },
  },
  {
    type: 'strength',
    label: 'Силові',
    icon: '🏋️‍♀️',
    usesIntensity: true,
    metBase: 5,
    intensityFactors: { light: 0.7, moderate: 1.0, high: 1.3 },
  },
  {
    type: 'yoga',
    label: 'Йога',
    icon: '🧘‍♀️',
    usesIntensity: true,
    metBase: 3,
    intensityFactors: { light: 0.8, moderate: 1.0, high: 1.3 },
  },
  {
    type: 'exercise',
    label: 'Зарядка',
    icon: '🤸‍♀️',
    usesIntensity: true,
    metBase: 3.5,
    intensityFactors: { light: 0.8, moderate: 1.0, high: 1.3 },
  },
  {
    type: 'fitness',
    label: 'Фітнес',
    icon: '💪',
    usesIntensity: true,
    metBase: 5,
    intensityFactors: { light: 0.8, moderate: 1.0, high: 1.3 },
  },
  {
    type: 'other',
    label: 'Інше',
    icon: '🎯',
    usesIntensity: true,
    metBase: 4,
    intensityFactors: { light: 0.8, moderate: 1.0, high: 1.3 },
  },
];

export default function Workouts() {
  const [selectedType, setSelectedType] = useState<WorkoutType>('walking');
  const [durationMin, setDurationMin] = useState(30);
  const [steps, setSteps] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [pace, setPace] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'high'>('moderate');
  const [notes, setNotes] = useState('');
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [userWeight, setUserWeight] = useState(70);

  const today = new Date().toISOString().split('T')[0];

  const loadWorkouts = useCallback(async () => {
    const entries = await db.workoutLogs.orderBy('createdAt').reverse().toArray();
    setWorkouts(entries);
  }, []);

  useEffect(() => {
    loadWorkouts();
    db.userProfile.toArray().then((profiles) => {
      if (profiles.length > 0) {
        setUserWeight(profiles[0].currentWeightKg);
      }
    });
  }, [loadWorkouts]);

  // Розрахунок калорій на основі вибраних параметрів
  const calculateCaloriesPreview = (): number => {
    const config = workoutTypes.find((w) => w.type === selectedType)!;
    const weight = userWeight;
    const hours = durationMin / 60;

    if (selectedType === 'walking') {
      if (steps > 0) {
        // Приблизна дистанція: крок ≈ 0.7 м
        const distance = (steps * 0.7) / 1000; // км
        return Math.round(weight * distance * 1.036);
      }
      return Math.round(weight * hours * 3.5);
    }

    if (selectedType === 'running') {
      const met = config.paceMets?.[pace] || 9;
      return Math.round(weight * hours * met);
    }

    if (selectedType === 'cycling') {
      let speed = 0;
      if (distanceKm > 0 && durationMin > 0) {
        speed = distanceKm / (durationMin / 60);
      }
      const met = config.metBySpeed ? config.metBySpeed(speed) : 6;
      return Math.round(weight * hours * met);
    }

    // Для інших типів з інтенсивністю
    const base = config.metBase || 4;
    const factor = config.intensityFactors?.[intensity] || 1.0;
    const met = base * factor;
    return Math.round(weight * hours * met);
  };

  const handleAddWorkout = async () => {
    const config = workoutTypes.find((w) => w.type === selectedType)!;
    const calories = calculateCaloriesPreview();

    // Будуємо об'єкт для збереження
    const entry: Omit<WorkoutLog, 'id'> = {
      date: today,
      type: selectedType,
      durationMin,
      caloriesBurned: calories,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
    };

    // Додаємо специфічні поля
    if (selectedType === 'walking' && steps > 0) {
      entry.steps = steps;
    }
    if ((selectedType === 'running' || selectedType === 'cycling') && distanceKm > 0) {
      entry.distanceKm = distanceKm;
    }
    if (selectedType === 'running') {
      entry.pace = pace;
    }
    if (config.usesIntensity) {
      entry.intensity = intensity;
    }

    await db.workoutLogs.add(entry);

    // Скидаємо форму
    setNotes('');
    setSteps(0);
    setDistanceKm(0);
    setPace('medium');
    setIntensity('moderate');
    setDurationMin(30);
    await loadWorkouts();
  };

  const handleDelete = async (id: number) => {
    await db.workoutLogs.delete(id);
    await loadWorkouts();
  };

  const totalCalories = workouts.reduce((acc, w) => acc + w.caloriesBurned, 0);
  const totalDuration = workouts.reduce((acc, w) => acc + w.durationMin, 0);
  const totalWorkouts = workouts.length;

  // Показуємо додаткову інформацію для кожного запису
  const getWorkoutDetails = (workout: WorkoutLog): string => {
    const parts: string[] = [];
    if (workout.steps) parts.push(`${workout.steps} кроків`);
    if (workout.distanceKm) parts.push(`${workout.distanceKm} км`);
    if (workout.pace) {
      const paceLabel = workout.pace === 'slow' ? 'повільний' : workout.pace === 'medium' ? 'середній' : 'швидкий';
      parts.push(`темп: ${paceLabel}`);
    }
    if (workout.intensity) {
      const intLabel = workout.intensity === 'light' ? 'легка' : workout.intensity === 'moderate' ? 'помірна' : 'висока';
      parts.push(`інтенсивність: ${intLabel}`);
    }
    return parts.join(' • ');
  };

  const selectedConfig = workoutTypes.find((w) => w.type === selectedType)!;

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Тренування</h1>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
          <p className="text-lg font-bold text-primary-dark">{totalWorkouts}</p>
          <p className="text-xs text-gray-500">тренувань</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
          <p className="text-lg font-bold text-orange-500">{totalDuration}</p>
          <p className="text-xs text-gray-500">хвилин</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
          <p className="text-lg font-bold text-green-500">{totalCalories}</p>
          <p className="text-xs text-gray-500">ккал спалено</p>
        </div>
      </div>

      {/* Форма */}
      <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">Нове тренування</h2>

        {/* Вибір типу */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {workoutTypes.map((workout) => (
            <button
              key={workout.type}
              onClick={() => setSelectedType(workout.type)}
              className={`p-2 rounded-xl text-center transition-colors ${
                selectedType === workout.type
                  ? 'bg-primary text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-pink-50'
              }`}
            >
              <span className="text-xl block">{workout.icon}</span>
              <span className="text-xs">{workout.label}</span>
            </button>
          ))}
        </div>

        {/* Специфічні поля */}
        <div className="space-y-3">
          {/* Кроки для ходьби */}
          {selectedConfig.usesSteps && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Кількість кроків (залиште 0, якщо рахуєте за часом)
              </label>
              <input
                type="number"
                value={steps}
                onChange={(e) => setSteps(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                min={0}
                placeholder="Напр., 6000"
              />
            </div>
          )}

          {/* Дистанція для бігу та велосипеда */}
          {selectedConfig.usesDistance && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дистанція (км)
              </label>
              <input
                type="number"
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                min={0}
                step={0.1}
                placeholder="Напр., 5"
              />
            </div>
          )}

          {/* Темп для бігу */}
          {selectedConfig.usesPace && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Темп
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'slow', label: 'Повільний' },
                  { value: 'medium', label: 'Середній' },
                  { value: 'fast', label: 'Швидкий' },
                ].map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPace(p.value as 'slow' | 'medium' | 'fast')}
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                      pace === p.value
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Інтенсивність для силових, йоги, зарядки, фітнесу, іншого */}
          {selectedConfig.usesIntensity && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Інтенсивність
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'light', label: 'Легка' },
                  { value: 'moderate', label: 'Помірна' },
                  { value: 'high', label: 'Висока' },
                ].map((i) => (
                  <button
                    key={i.value}
                    onClick={() => setIntensity(i.value as 'light' | 'moderate' | 'high')}
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                      intensity === i.value
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {i.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Час */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тривалість (хвилин)
            </label>
            <input
              type="number"
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              min={1}
              max={300}
            />
          </div>

          {/* Нотатка */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Нотатка (необов'язково)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              placeholder="Наприклад: ранкова пробіжка"
            />
          </div>

          {/* Попередній розрахунок калорій */}
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <p className="text-sm text-gray-600">Приблизно спалено:</p>
            <p className="text-2xl font-bold text-orange-500">
              {calculateCaloriesPreview()} ккал
            </p>
          </div>

          <button
            onClick={handleAddWorkout}
            className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Додати тренування
          </button>
        </div>
      </div>

      {/* Історія */}
      <div className="space-y-2">
        {workouts.map((workout) => {
          const workoutInfo = workoutTypes.find((w) => w.type === workout.type);
          return (
            <div key={workout.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">{workoutInfo?.icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{workoutInfo?.label}</p>
                  <p className="text-xs text-gray-500">
                    {workout.durationMin} хв • {workout.date}
                    {workout.notes && ` • ${workout.notes}`}
                  </p>
                  {getWorkoutDetails(workout) && (
                    <p className="text-xs text-gray-400 mt-0.5">{getWorkoutDetails(workout)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm text-orange-500 flex items-center gap-1">
                  <Flame size={14} />
                  {workout.caloriesBurned}
                </span>
                <button
                  onClick={() => handleDelete(workout.id!)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {workouts.length === 0 && (
        <div className="text-center py-8">
          <Dumbbell size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Ще немає тренувань</p>
          <p className="text-gray-300 text-sm mt-1">Додай своє перше тренування!</p>
        </div>
      )}
    </div>
  );
}