import Dexie from 'dexie';
import type { Table } from 'dexie';

// ========== ТИПИ ДАНИХ ==========
export interface UserProfile {
  id?: number;
  name: string;
  birthYear: number;
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
  goal: 'lose' | 'maintain' | 'gain';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active';
  gender: 'male' | 'female';
  createdAt: string;
}

export interface FoodItem {
  id?: number;
  name: string;
  brand?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
  source: 'local' | 'manual' | 'openfoodfacts';
  barcode?: string;
}

export interface FoodEntry {
  id?: number;
  date: string;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodId: number;
  grams: number;
  createdAt: string;
}

export interface WeightEntry {
  id?: number;
  date: string;
  weightKg: number;
  note?: string;
  createdAt: string;
}

export interface WaterLog {
  id?: number;
  date: string;
  amountMl: number;
  createdAt: string;
}

export interface PhotoEntry {
  id?: number;
  date: string;
  blob: Blob;
  thumbnail: Blob;
  note?: string;
  createdAt: string;
}

export interface WorkoutLog {
  id?: number;
  date: string;
  type: 'walking' | 'running' | 'strength' | 'yoga' | 'cycling' | 'other';
  durationMin: number;
  caloriesBurned: number;
  notes?: string;
  createdAt: string;
}

export interface UserGoal {
  id?: number;
  type: 'weight' | 'water' | 'workouts' | 'calories';
  targetValue: number;
  period: 'day' | 'week' | 'total';
  isActive: boolean;
  createdAt: string;
}

// ========== БАЗА ДАНИХ ==========
export class FitnessDatabase extends Dexie {
  userProfile!: Table<UserProfile, number>;
  foodItems!: Table<FoodItem, number>;
  foodEntries!: Table<FoodEntry, number>;
  weightEntries!: Table<WeightEntry, number>;
  waterLogs!: Table<WaterLog, number>;
  photoEntries!: Table<PhotoEntry, number>;
  workoutLogs!: Table<WorkoutLog, number>;
  userGoals!: Table<UserGoal, number>;

  constructor() {
    super('fitness-app');
    this.version(3).stores({
      userProfile: '++id',
      foodItems: '++id, name, source',
      foodEntries: '++id, date, meal',
      weightEntries: '++id, date',
      waterLogs: '++id, date',
      photoEntries: '++id, date',
      workoutLogs: '++id, date, type, createdAt',
      userGoals: '++id, type, isActive',
    }).upgrade(tx => {
      return tx.table('userProfile').toCollection().modify(profile => {
        if (!profile.gender) {
          profile.gender = 'female'; // за замовчуванням жіноча стать
        }
      });
    });
  }
}

export const db = new FitnessDatabase();