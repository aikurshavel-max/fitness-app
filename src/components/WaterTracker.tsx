import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database';
import { Droplets, Plus, Minus } from 'lucide-react';

interface WaterTrackerProps {
  waterTarget: number;
}

export default function WaterTracker({ waterTarget }: WaterTrackerProps) {
  const [totalMl, setTotalMl] = useState(0);
  const today = new Date().toISOString().split('T')[0];

  const loadWater = useCallback(async () => {
    const logs = await db.waterLogs.where('date').equals(today).toArray();
    const sum = logs.reduce((acc, log) => acc + log.amountMl, 0);
    setTotalMl(sum);
  }, [today]);

  useEffect(() => {
    loadWater();
  }, [loadWater]);

  const addWater = async (amountMl: number) => {
    await db.waterLogs.add({
      date: today,
      amountMl,
      createdAt: new Date().toISOString(),
    });
    await loadWater();
  };

  const removeWater = async () => {
    const logs = await db.waterLogs.where('date').equals(today).toArray();
    if (logs.length > 0) {
      const lastLog = logs[logs.length - 1];
      await db.waterLogs.delete(lastLog.id!);
      await loadWater();
    }
  };

  const progress = waterTarget > 0 ? Math.min((totalMl / waterTarget) * 100, 100) : 0;
  const remaining = Math.max(waterTarget - totalMl, 0);

  return (
    <div className="bg-white rounded-2xl shadow-md p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Droplets className="text-blue-500" size={20} />
          <h2 className="font-semibold text-gray-800">Вода</h2>
        </div>
        <span className="text-sm text-gray-500">
          {totalMl} / {waterTarget} мл
        </span>
      </div>

      {/* Прогрес-бар */}
      <div className="w-full bg-gray-100 rounded-full h-4 mb-3">
        <div
          className="bg-blue-500 h-4 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-center text-sm text-gray-600 mb-3">
        {remaining > 0 ? `Залишилось: ${remaining} мл` : '✅ Норма виконана!'}
      </p>

      {/* Кнопки швидкого додавання */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => addWater(100)}
          className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
        >
          +100 мл
        </button>
        <button
          onClick={() => addWater(200)}
          className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
        >
          +200 мл
        </button>
        <button
          onClick={() => addWater(300)}
          className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
        >
          +300 мл
        </button>
        <button
          onClick={() => addWater(500)}
          className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
        >
          +500 мл
        </button>
      </div>

      {/* Видалення останнього запису */}
      {totalMl > 0 && (
        <button
          onClick={removeWater}
          className="mt-3 w-full flex items-center justify-center gap-1 text-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          <Minus size={14} />
          Прибрати останній запис
        </button>
      )}
    </div>
  );
}