import { db } from '../db/database';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  progress: number;
  target: number;
}

export async function getAchievements(): Promise<Achievement[]> {
  const achievements: Achievement[] = [];

  // Завантаження даних
  const profile = await db.userProfile.toArray();
  const foodEntries = await db.foodEntries.toArray();
  const waterLogs = await db.waterLogs.toArray();
  const workoutLogs = await db.workoutLogs.toArray();
  const weightEntries = await db.weightEntries.toArray();
  const photos = await db.photoEntries.toArray();

  // Кількість днів з даними
  const uniqueDays = new Set<string>();
  foodEntries.forEach(e => uniqueDays.add(e.date));
  waterLogs.forEach(l => uniqueDays.add(l.date));
  workoutLogs.forEach(w => uniqueDays.add(w.date));
  const activeDays = uniqueDays.size;

  // 1. Перший крок
  achievements.push({
    id: 'first-food',
    title: 'Перший запис їжі',
    description: 'Додай перший продукт у щоденник',
    icon: '🍽️',
    earned: foodEntries.length >= 1,
    progress: Math.min(foodEntries.length, 1),
    target: 1,
  });

  // 2. 10 записів їжі
  achievements.push({
    id: 'food-10',
    title: '10 записів їжі',
    description: 'Додай 10 продуктів у щоденник',
    icon: '📝',
    earned: foodEntries.length >= 10,
    progress: Math.min(foodEntries.length, 10),
    target: 10,
  });

  // 3. Перше тренування
  achievements.push({
    id: 'first-workout',
    title: 'Перше тренування',
    description: 'Запиши перше тренування',
    icon: '💪',
    earned: workoutLogs.length >= 1,
    progress: Math.min(workoutLogs.length, 1),
    target: 1,
  });

  // 4. 5 тренувань
  achievements.push({
    id: 'workout-5',
    title: '5 тренувань',
    description: 'Виконай 5 тренувань',
    icon: '🏋️‍♀️',
    earned: workoutLogs.length >= 5,
    progress: Math.min(workoutLogs.length, 5),
    target: 5,
  });

  // 5. Вода - день
  const today = new Date().toISOString().split('T')[0];
  const todayWater = waterLogs.filter(l => l.date === today).reduce((acc, l) => acc + l.amountMl, 0);
  const waterTarget = profile.length > 0 ? Math.round(profile[0].currentWeightKg * 35) : 2500;
  achievements.push({
    id: 'water-day',
    title: 'Водний баланс',
    description: 'Випий денну норму води',
    icon: '💧',
    earned: todayWater >= waterTarget,
    progress: Math.min(todayWater, waterTarget),
    target: waterTarget,
  });

  // 6. Активні дні
  achievements.push({
    id: 'active-days-3',
    title: '3 активних дні',
    description: 'Записуй дані 3 дні',
    icon: '📅',
    earned: activeDays >= 3,
    progress: Math.min(activeDays, 3),
    target: 3,
  });

  // 7. Активні дні - 7
  achievements.push({
    id: 'active-days-7',
    title: 'Тиждень активності',
    description: 'Записуй дані 7 днів',
    icon: '🔥',
    earned: activeDays >= 7,
    progress: Math.min(activeDays, 7),
    target: 7,
  });

  // 8. Відстеження ваги
  achievements.push({
    id: 'weight-3',
    title: '3 зважування',
    description: 'Запиши вагу 3 рази',
    icon: '⚖️',
    earned: weightEntries.length >= 3,
    progress: Math.min(weightEntries.length, 3),
    target: 3,
  });

  // 9. Фото прогресу
  achievements.push({
    id: 'photo-1',
    title: 'Перше фото',
    description: 'Додай фото прогресу',
    icon: '📸',
    earned: photos.length >= 1,
    progress: Math.min(photos.length, 1),
    target: 1,
  });

  return achievements;
}