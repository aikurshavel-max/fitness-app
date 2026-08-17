import { db } from '../db/database';
import { calculateAll } from '../utils/calculations';

export interface AssistantMessage {
  id: string;
  type: 'praise' | 'info' | 'warning' | 'tip' | 'motivation';
  text: string;
  icon: string;
}

interface DailyData {
  calories: number;
  targetCalories: number;
  waterMl: number;
  waterTarget: number;
  workoutCalories: number;
  workoutCount: number;
  proteinG: number;
  targetProteinG: number;
  fatG: number;
  targetFatG: number;
  carbsG: number;
  targetCarbsG: number;
  weightChange: number | null;
  streak: number;
}

export async function generateAssistantMessages(): Promise<AssistantMessage[]> {
  const messages: AssistantMessage[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Завантаження профілю
  const profiles = await db.userProfile.toArray();
  if (profiles.length === 0) {
    return [{
      id: 'no-profile',
      type: 'info',
      text: 'Заповни профіль, щоб я міг давати тобі персоналізовані поради! 👋',
      icon: '👤',
    }];
  }

  const profile = profiles[0];
  const calculation = calculateAll({
    birthYear: profile.birthYear,
    heightCm: profile.heightCm,
    currentWeightKg: profile.currentWeightKg,
    goalWeightKg: profile.goalWeightKg,
    goal: profile.goal,
    activityLevel: profile.activityLevel,
  });

  // Завантаження даних за сьогодні
  const foodEntries = await db.foodEntries.where('date').equals(today).toArray();
  const waterLogs = await db.waterLogs.where('date').equals(today).toArray();
  const workoutLogs = await db.workoutLogs.where('date').equals(today).toArray();

  // Підрахунок калорій та БЖВ
  let calories = 0;
  let proteinG = 0;
  let fatG = 0;
  let carbsG = 0;

  for (const entry of foodEntries) {
    const food = await db.foodItems.get(entry.foodId);
    if (food) {
      calories += Math.round((food.caloriesPer100g * entry.grams) / 100);
      proteinG += (food.proteinPer100g * entry.grams) / 100;
      fatG += (food.fatPer100g * entry.grams) / 100;
      carbsG += (food.carbsPer100g * entry.grams) / 100;
    }
  }

  // Вода
  const waterMl = waterLogs.reduce((acc, log) => acc + log.amountMl, 0);
  const waterTarget = Math.round(profile.currentWeightKg * 35);

  // Тренування
  const workoutCalories = workoutLogs.reduce((acc, w) => acc + w.caloriesBurned, 0);
  const workoutCount = workoutLogs.length;

  // Перевірка ваги
  const weightEntries = await db.weightEntries.orderBy('date').toArray();
  let weightChange: number | null = null;
  if (weightEntries.length > 1) {
    const lastWeight = weightEntries[weightEntries.length - 1].weightKg;
    const firstWeight = weightEntries[0].weightKg;
    weightChange = Math.round((lastWeight - firstWeight) * 10) / 10;
  }

  const data: DailyData = {
    calories,
    targetCalories: calculation.targetCalories,
    waterMl,
    waterTarget,
    workoutCalories,
    workoutCount,
    proteinG: Math.round(proteinG),
    targetProteinG: calculation.macros.proteinG,
    fatG: Math.round(fatG),
    targetFatG: calculation.macros.fatG,
    carbsG: Math.round(carbsG),
    targetCarbsG: calculation.macros.carbsG,
    weightChange,
    streak: 0,
  };

  // ====== ГЕНЕРАЦІЯ ПОВІДОМЛЕНЬ ======
  const userName = profile.name;
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'ранок' : hour < 17 ? 'день' : 'вечір';

  // Привітання
  messages.push({
    id: 'greeting',
    type: 'motivation',
    text: `Доброго ${timeOfDay === 'ранок' ? 'ранку' : timeOfDay === 'день' ? 'дня' : 'вечора'}, ${userName}! Я твій персональний асистент. Ось мій аналіз на сьогодні:`,
    icon: timeOfDay === 'ранок' ? '🌅' : timeOfDay === 'день' ? '☀️' : '🌙',
  });

  // 1. Калорії
  const caloriePercentage = (calories / data.targetCalories) * 100;

  if (caloriePercentage === 0) {
    messages.push({
      id: 'calories-empty',
      type: 'info',
      text: `${userName}, ти ще не їла сьогодні. Твій план: ${data.targetCalories} ккал. Пропоную почати з корисного сніданку: вівсянка з ягодами + яйце + склянка води. 🍳`,
      icon: '🍳',
    });
  } else if (caloriePercentage < 50) {
    const remaining = data.targetCalories - calories;
    messages.push({
      id: 'calories-low',
      type: 'tip',
      text: `${userName}, ти з'їла ${calories} ккал. Залишилось ${remaining} ккал. Рекомендую додати білок (курка, риба, сир) та овочі. Ось приклад: 150г курячої грудки + салат з огірків і помідорів. 🥗`,
      icon: '🥗',
    });
  } else if (caloriePercentage <= 100) {
    const remaining = data.targetCalories - calories;
    messages.push({
      id: 'calories-ok',
      type: 'praise',
      text: `${userName}, ти чудово тримаєш баланс! ${calories} ккал з ${data.targetCalories}. Залишилось ${remaining} ккал. Так тримати! 💪`,
      icon: '💪',
    });
  } else if (caloriePercentage <= 115) {
    messages.push({
      id: 'calories-over-slight',
      type: 'warning',
      text: `${userName}, ти трохи перевищила норму (${calories} з ${data.targetCalories}). Не хвилюйся! Просто зроби акцент на овочах і воді до кінця дня. 🥦`,
      icon: '🥦',
    });
  } else {
    messages.push({
      id: 'calories-over',
      type: 'warning',
      text: `${userName}, сьогодні калорій забагато (${calories} з ${data.targetCalories}). Це не катастрофа! Завтра повернемось до плану. Головне — не здавайся! 🌅`,
      icon: '🌅',
    });
  }

  // 2. Білки
  const proteinPercentage = (data.proteinG / data.targetProteinG) * 100;
  if (proteinPercentage < 50 && foodEntries.length > 0) {
    const needed = data.targetProteinG - data.proteinG;
    messages.push({
      id: 'protein-low',
      type: 'tip',
      text: `${userName}, білків замало: ${data.proteinG} г з ${data.targetProteinG} г. Потрібно ще ${needed} г. Додай: 2 яйця (12г), 100г сиру (18г) або 150г курячої грудки (45г). 🥚`,
      icon: '🥚',
    });
  } else if (proteinPercentage >= 100) {
    messages.push({
      id: 'protein-ok',
      type: 'praise',
      text: `${userName}, білки виконано на 100%! ${data.proteinG} г — це чудово для м'язів! 💪`,
      icon: '💪',
    });
  }

  // 3. Вода
  const waterPercentage = (waterMl / waterTarget) * 100;
  if (waterPercentage === 0) {
    messages.push({
      id: 'water-empty',
      type: 'warning',
      text: `${userName}, ти ще не пила воду! Норма — ${waterTarget} мл. Випий зараз склянку (250 мл). Вода прискорює метаболізм і допомагає схуднути! 💧`,
      icon: '💧',
    });
  } else if (waterPercentage < 50) {
    const remainingWater = waterTarget - waterMl;
    messages.push({
      id: 'water-low',
      type: 'tip',
      text: `${userName}, води поки ${waterMl} мл з ${waterTarget} мл. Залишилось ${remainingWater} мл — це приблизно ${Math.round(remainingWater / 250)} склянок. Спробуй пити по склянці щогодини! 💧`,
      icon: '💧',
    });
  } else if (waterPercentage >= 100) {
    messages.push({
      id: 'water-ok',
      type: 'praise',
      text: `${userName}, норму води виконано! ${waterMl} мл — ти справжня гідратована зірка! 🌊`,
      icon: '🌊',
    });
  } else if (waterPercentage >= 50) {
    const remainingWater = waterTarget - waterMl;
    messages.push({
      id: 'water-half',
      type: 'praise',
      text: `${userName}, ти на півшляху до норми води! Залишилось ${remainingWater} мл. Продовжуй! 💧`,
      icon: '💧',
    });
  }

  // 4. Тренування
  if (workoutCount === 0) {
    messages.push({
      id: 'workout-none',
      type: 'tip',
      text: `${userName}, сьогодні ще не було тренування. Пропоную: 20 хв прогулянки (≈${Math.round(3.5 * profile.currentWeightKg * (20/60))} ккал) або 15 хв йоги. Навіть маленька активність — це крок до мети! 🚶‍♀️`,
      icon: '🚶‍♀️',
    });
  } else {
    messages.push({
      id: 'workout-done',
      type: 'praise',
      text: `${userName}, ти спалила ${workoutCalories} ккал на тренуванні! Це еквівалентно ${Math.round(workoutCalories / 7700 * 1000)} г жиру. Ти неймовірна! 🔥`,
      icon: '🔥',
    });
  }

  // 5. Зміна ваги
  if (weightChange !== null) {
    if (profile.goal === 'lose' && weightChange < 0) {
      messages.push({
        id: 'weight-losing',
        type: 'praise',
        text: `${userName}, ти схудла на ${Math.abs(weightChange)} кг! Це результат твоєї роботи! Продовжуй! 🎉`,
        icon: '🎉',
      });
    } else if (profile.goal === 'lose' && weightChange > 0) {
      messages.push({
        id: 'weight-gaining',
        type: 'motivation',
        text: `${userName}, вага трохи коливається (+${weightChange} кг). Це нормально — може бути вода чи м'язи. Дивись на довгостроковий тренд! 🌟`,
        icon: '🌟',
      });
    } else if (profile.goal === 'gain' && weightChange > 0) {
      messages.push({
        id: 'weight-gain-goal',
        type: 'praise',
        text: `${userName}, ти набрала ${weightChange} кг! Рухаєшся до мети! Продовжуй тренуватись і правильно харчуватись! 💪`,
        icon: '💪',
      });
    }
  }

  // 6. Підсумок дня (ввечері)
  if (hour >= 18) {
    const goodThings: string[] = [];
    const improvements: string[] = [];

    if (waterPercentage >= 100) goodThings.push('воду виконано');
    else improvements.push(`води ще ${waterTarget - waterMl} мл`);

    if (workoutCount > 0) goodThings.push('тренування є');
    else improvements.push('тренування відсутнє');

    if (caloriePercentage <= 100 && caloriePercentage > 0) goodThings.push('калорії в нормі');
    else if (caloriePercentage > 100) improvements.push('калорії перевищено');
    else improvements.push('калорій замало');

    let summaryText = `${userName}, підсумок дня:\n`;
    if (goodThings.length > 0) summaryText += `✅ Добре: ${goodThings.join(', ')}.\n`;
    if (improvements.length > 0) summaryText += `🔧 Можна покращити: ${improvements.join(', ')}.`;

    messages.push({
      id: 'summary',
      type: 'info',
      text: summaryText,
      icon: '📊',
    });
  }

  // Обмежуємо кількість повідомлень (мінімум 4, максимум 6)
  return messages.slice(0, 6);
}