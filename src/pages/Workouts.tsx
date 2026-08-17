import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database';
import { Dumbbell, Trash2, Plus, Flame } from 'lucide-react';

type WorkoutType = 'walking' | 'running' | 'strength' | 'yoga' | 'cycling' | 'other';

const workoutTypes: { type: WorkoutType; label: string; icon: string; met: number }[] = [
  { type: 'walking', label: 'Ходьба', icon: '🚶‍♀️', met: 3.5 },
  { type: 'running', label: 'Біг', icon: '🏃‍♀️', met: 7.0 },
  { type: 'strength', label: 'Силові', icon: '🏋️‍♀️', met: 5.0 },
  { type: 'yoga', label: 'Йога', icon: '🧘‍♀️', met: 2.5 },
  { type: 'cycling', label: 'Велосипед', icon: '🚴‍♀️', met: 6.0 },
  { type: 'other', label: 'Інше', icon: '💪', met: 4.0 },
];

export default function Workouts() {
  const [selectedType, setSelectedType] = useState<WorkoutType>('walking');
  const [durationMin, setDurationMin] = useState(30);
  const [notes, setNotes] = useState('');
  const [workouts, setWorkouts] = useState<any[]>([]);
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

  const handleAddWorkout = async () => {
    try {
      const workoutType = workoutTypes.find((w) => w.type === selectedType)!;
      const caloriesBurned = Math.round(workoutType.met * userWeight * (durationMin / 60));

      await db.workoutLogs.add({
        date: today,
        type: selectedType,
        durationMin,
        caloriesBurned,
        notes: notes || undefined,
        createdAt: new Date().toISOString(),
      });

      setNotes('');
      setDurationMin(30);
      await loadWorkouts();
    } catch (error) {
      console.error('Помилка додавання тренування:', error);
      alert('Помилка додавання тренування. Перевір консоль.');
    }
  };

  const handleDelete = async (id: number) => {
    await db.workoutLogs.delete(id);
    await loadWorkouts();
  };

  const totalCalories = workouts.reduce((acc, w) => acc + w.caloriesBurned, 0);
  const totalDuration = workouts.reduce((acc, w) => acc + w.durationMin, 0);
  const totalWorkouts = workouts.length;

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Тренування</h1>

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

      <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">Нове тренування</h2>

        <div className="grid grid-cols-3 gap-2 mb-3">
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

        <div className="mb-3">
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

        <div className="mb-3">
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

        <div className="bg-orange-50 rounded-xl p-3 text-center mb-3">
          <p className="text-sm text-gray-600">Приблизно спалено:</p>
          <p className="text-2xl font-bold text-orange-500">
            {Math.round(workoutTypes.find((w) => w.type === selectedType)!.met * userWeight * (durationMin / 60))} ккал
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

      <div className="space-y-2">
        {workouts.map((workout) => {
          const workoutInfo = workoutTypes.find((w) => w.type === workout.type);
          return (
            <div key={workout.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{workoutInfo?.icon}</span>
                <div>
                  <p className="font-medium text-gray-800">{workoutInfo?.label}</p>
                  <p className="text-xs text-gray-500">
                    {workout.durationMin} хв • {workout.date}
                    {workout.notes && ` • ${workout.notes}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
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