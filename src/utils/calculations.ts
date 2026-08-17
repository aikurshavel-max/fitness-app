// ========== ФОРМУЛИ РОЗРАХУНКУ КАЛОРІЙ ==========

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
export type Goal = 'lose' | 'maintain' | 'gain';

export interface UserData {
  birthYear: number;
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
  goal: Goal;
  activityLevel: ActivityLevel;
}

export interface MacroTargets {
  proteinG: number;
  fatG: number;
  carbsG: number;
}

// ========== BMR (базовий метаболізм) ==========
// Формула Міффліна-Сан Жеора для жінок
export function calculateBMR(weightKg: number, heightCm: number, age: number): number {
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  return Math.round(bmr);
}

// ========== TDEE (денна норма калорій) ==========
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const factors: Record<ActivityLevel, number> = {
    sedentary: 1.2,      // сидячий спосіб життя
    light: 1.375,        // легкі тренування 1-3 рази/тиждень
    moderate: 1.55,      // тренування 3-5 разів/тиждень
    active: 1.725,       // тренування 6-7 разів/тиждень
  };
  return Math.round(bmr * factors[activityLevel]);
}

// ========== Цільова норма калорій ==========
export function calculateTargetCalories(tdee: number, goal: Goal): number {
  if (goal === 'lose') return Math.round(tdee * 0.85);      // дефіцит 15%
  if (goal === 'gain') return Math.round(tdee * 1.15);      // профіцит 15%
  return tdee;                                               // підтримання
}

// ========== Розрахунок макронутрієнтів ==========
export function calculateMacros(
  targetCalories: number,
  weightKg: number
): MacroTargets {
  // Білок: 1.6-2.2 г на кг ваги (беремо 1.8)
  const proteinG = Math.round(weightKg * 1.8);
  
  // Жири: 0.8-1.0 г на кг ваги (беремо 0.9)
  const fatG = Math.round(weightKg * 0.9);
  
  // Калорії з білків та жирів
  const proteinCalories = proteinG * 4;
  const fatCalories = fatG * 9;
  
  // Вуглеводи: решта калорій
  const carbsCalories = targetCalories - proteinCalories - fatCalories;
  const carbsG = Math.max(0, Math.round(carbsCalories / 4));
  
  return { proteinG, fatG, carbsG };
}

// ========== Вік з року народження ==========
export function calculateAge(birthYear: number): number {
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear;
}

// ========== Повний розрахунок ==========
export interface FullCalculation {
  age: number;
  bmr: number;
  tdee: number;
  targetCalories: number;
  macros: MacroTargets;
  bmi: number;
}

export function calculateAll(data: UserData): FullCalculation {
  const age = calculateAge(data.birthYear);
  const bmr = calculateBMR(data.currentWeightKg, data.heightCm, age);
  const tdee = calculateTDEE(bmr, data.activityLevel);
  const targetCalories = calculateTargetCalories(tdee, data.goal);
  const macros = calculateMacros(targetCalories, data.currentWeightKg);
  
  // BMI (індекс маси тіла)
  const heightM = data.heightCm / 100;
  const bmi = Math.round((data.currentWeightKg / (heightM * heightM)) * 10) / 10;
  
  return { age, bmr, tdee, targetCalories, macros, bmi };
}

// ========== Розрахунок води (мл на день) ==========
export function calculateWaterTarget(weightKg: number): number {
  return Math.round(weightKg * 35); // 30-35 мл на кг ваги
}