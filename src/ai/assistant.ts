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

// Допоміжна функція для правильних закінчень
function getGenderForms(gender: 'male' | 'female') {
  if (gender === 'male') {
    return {
      ate: 'з\'їв',
      drink: 'пив',
      burned: 'спалив',
      lost: 'схуд',
      gained: 'набрав',
      exceeded: 'перевищив',
      completed: 'виконав',
    };
  }
  return {
    ate: 'з\'їла',
    drink: 'пила',
    burned: 'спалила',
    lost: 'схудла',
    gained: 'набрала',
    exceeded: 'перевищила',
    completed: 'виконала',
  };
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
  const gender = profile.gender || 'female';
  const g = getGenderForms(gender);

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
      text: `${userName}, ти ще не ${g.ate} сьогодні. Твій план: ${data.targetCalories} ккал. Пропоную почати з корисного сніданку: вівсянка з ягодами + яйце + склянка води. 🍳`,
      icon: '🍳',
    });
  } else if (caloriePercentage < 50) {
    const remaining = data.targetCalories - calories;
    messages.push({
      id: 'calories-low',
      type: 'tip',
      text: `${userName}, ти ${g.ate} ${calories} ккал. Залишилось ${remaining} ккал. Рекомендую додати білок (курка, риба, сир) та овочі. Ось приклад: 150г курячої грудки + салат з огірків і помідорів. 🥗`,
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
      text: `${userName}, ти трохи ${g.exceeded} норму (${calories} з ${data.targetCalories}). Не хвилюйся! Просто зроби акцент на овочах і воді до кінця дня. 🥦`,
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
      text: `${userName}, ти ще не ${g.drink} воду! Норма — ${waterTarget} мл. Випий зараз склянку (250 мл). Вода прискорює метаболізм і допомагає схуднути! 💧`,
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
      text: `${userName}, ти ${g.burned} ${workoutCalories} ккал на тренуванні! Це еквівалентно ${Math.round(workoutCalories / 7700 * 1000)} г жиру. Ти неймовірний! 🔥`,
      icon: '🔥',
    });
  }

  // 5. Зміна ваги
  if (weightChange !== null) {
    if (profile.goal === 'lose' && weightChange < 0) {
      messages.push({
        id: 'weight-losing',
        type: 'praise',
        text: `${userName}, ти ${g.lost} на ${Math.abs(weightChange)} кг! Це результат твоєї роботи! Продовжуй! 🎉`,
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
        text: `${userName}, ти ${g.gained} ${weightChange} кг! Рухаєшся до мети! Продовжуй тренуватись і правильно харчуватись! 💪`,
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

  return messages.slice(0, 6);
}

// ====== НОВА ФУНКЦІЯ: Тижневий звіт ======
export async function generateWeeklyReport(): Promise<AssistantMessage> {
  const profiles = await db.userProfile.toArray();
  if (profiles.length === 0) {
    return {
      id: 'weekly-no-profile',
      type: 'info',
      text: 'Заповни профіль, щоб я міг створити тижневий звіт.',
      icon: '👤',
    };
  }

  const profile = profiles[0];
  const userName = profile.name;

  // Розрахунок цільових калорій
  const calculation = calculateAll({
    birthYear: profile.birthYear,
    heightCm: profile.heightCm,
    currentWeightKg: profile.currentWeightKg,
    goalWeightKg: profile.goalWeightKg,
    goal: profile.goal,
    activityLevel: profile.activityLevel,
  });
  const targetCalories = calculation.targetCalories;
  const targetProtein = calculation.macros.proteinG;

  // Збираємо дані за 7 днів
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({ date: dateStr, calories: 0, protein: 0, workouts: 0 });
  }

  const foodEntries = await db.foodEntries.toArray();
  for (const entry of foodEntries) {
    const day = days.find((d) => d.date === entry.date);
    if (day) {
      const food = await db.foodItems.get(entry.foodId);
      if (food) {
        day.calories += Math.round((food.caloriesPer100g * entry.grams) / 100);
        day.protein += (food.proteinPer100g * entry.grams) / 100;
      }
    }
  }

  const workoutLogs = await db.workoutLogs.toArray();
  for (const log of workoutLogs) {
    const day = days.find((d) => d.date === log.date);
    if (day) {
      day.workouts += 1;
    }
  }

  // Рахуємо середні значення за дні з записами
  const daysWithFood = days.filter((d) => d.calories > 0);
  const avgCalories = daysWithFood.length > 0 
    ? Math.round(daysWithFood.reduce((acc, d) => acc + d.calories, 0) / daysWithFood.length) 
    : 0;
  const avgProtein = daysWithFood.length > 0 
    ? Math.round(daysWithFood.reduce((acc, d) => acc + d.protein, 0) / daysWithFood.length) 
    : 0;
  const totalWorkouts = days.reduce((acc, d) => acc + d.workouts, 0);

  // Зміна ваги за тиждень
  const weightEntries = await db.weightEntries.orderBy('date').toArray();
  let weightChange: number | null = null;
  if (weightEntries.length > 1) {
    const lastWeight = weightEntries[weightEntries.length - 1].weightKg;
    const firstWeight = weightEntries[0].weightKg;
    weightChange = Math.round((lastWeight - firstWeight) * 10) / 10;
  }

  // Формуємо звіт
  let text = `${userName}, ось твій тижневий звіт:\n\n`;
  text += `📊 Середня калорійність: ${avgCalories} ккал (ціль: ${targetCalories} ккал)\n`;
  text += `🥩 Середній білок: ${avgProtein} г (ціль: ${targetProtein} г)\n`;
  text += `🏋️‍♀️ Тренувань за тиждень: ${totalWorkouts}\n`;

  if (weightChange !== null) {
    text += `⚖️ Зміна ваги: ${weightChange > 0 ? '+' : ''}${weightChange} кг\n`;
  } else {
    text += `⚖️ Зміна ваги: недостатньо даних\n`;
  }

  // Аналіз та поради
  if (avgCalories > 0) {
    if (avgCalories > targetCalories * 1.1) {
      text += `\n🔧 Калорій трохи більше, ніж потрібно. Спробуй зменшити порції на 10-15% або додати більше овочів.`;
    } else if (avgCalories < targetCalories * 0.8) {
      text += `\n🔧 Калорій замало. Важливо не голодувати — додай корисні перекуси: горіхи, йогурт, фрукти.`;
    } else {
      text += `\n✅ Калорійність у чудовому балансі!`;
    }

    if (avgProtein < targetProtein * 0.8) {
      text += `\n🔧 Білка замало. Додай яйця, сир, курку або рибу.`;
    } else {
      text += `\n✅ Білок на хорошому рівні.`;
    }
  }

  if (totalWorkouts < 2) {
    text += `\n🔧 Тренувань замало. Навіть 2-3 рази на тиждень по 30 хв дадуть результат.`;
  } else {
    text += `\n✅ Тренування регулярні, так тримати!`;
  }

  return {
    id: 'weekly-report',
    type: 'info',
    text,
    icon: '📊',
  };
}