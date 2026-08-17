// ========== ЛОКАЛЬНА БАЗА ПРОДУКТІВ ==========
// Значення на 100 г продукту

export interface LocalFoodProduct {
  name: string;
  category: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export const foodDatabase: LocalFoodProduct[] = [
  // ===== КРУПИ ТА КАШІ =====
  { name: 'Гречка варена', category: 'Крупи', calories: 110, protein: 4.2, fat: 1.1, carbs: 21.3 },
  { name: 'Гречка суха', category: 'Крупи', calories: 330, protein: 12.6, fat: 3.3, carbs: 64.0 },
  { name: 'Рис білий варений', category: 'Крупи', calories: 130, protein: 2.7, fat: 0.3, carbs: 28.2 },
  { name: 'Рис бурий варений', category: 'Крупи', calories: 112, protein: 2.6, fat: 0.9, carbs: 24.0 },
  { name: 'Вівсянка суха', category: 'Крупи', calories: 389, protein: 16.9, fat: 6.9, carbs: 66.3 },
  { name: 'Вівсянка на воді', category: 'Крупи', calories: 68, protein: 2.4, fat: 1.4, carbs: 12.0 },
  { name: 'Булгур варений', category: 'Крупи', calories: 83, protein: 3.1, fat: 0.2, carbs: 18.6 },
  { name: 'Кіноа варена', category: 'Крупи', calories: 120, protein: 4.4, fat: 1.9, carbs: 21.3 },
  { name: 'Макарони варені', category: 'Крупи', calories: 158, protein: 5.8, fat: 0.9, carbs: 30.9 },
  { name: 'Хліб білий', category: 'Крупи', calories: 265, protein: 9.0, fat: 3.2, carbs: 49.0 },
  { name: 'Хліб цільнозерновий', category: 'Крупи', calories: 247, protein: 13.0, fat: 3.4, carbs: 41.0 },

  // ===== М'ЯСО ТА РИБА =====
  { name: 'Куряча грудка варена', category: 'М\'ясо', calories: 165, protein: 31.0, fat: 3.6, carbs: 0 },
  { name: 'Куряча грудка смажена', category: 'М\'ясо', calories: 197, protein: 30.0, fat: 8.0, carbs: 0 },
  { name: 'Куряче стегно запечене', category: 'М\'ясо', calories: 209, protein: 26.0, fat: 11.0, carbs: 0 },
  { name: 'Індичка варена', category: 'М\'ясо', calories: 135, protein: 29.0, fat: 2.0, carbs: 0 },
  { name: 'Яловичина варена', category: 'М\'ясо', calories: 250, protein: 26.0, fat: 15.0, carbs: 0 },
  { name: 'Свинина запечена', category: 'М\'ясо', calories: 242, protein: 27.0, fat: 14.0, carbs: 0 },
  { name: 'Лосось запечений', category: 'Риба', calories: 208, protein: 20.0, fat: 13.0, carbs: 0 },
  { name: 'Тріска варена', category: 'Риба', calories: 82, protein: 18.0, fat: 0.7, carbs: 0 },
  { name: 'Тунець консервований', category: 'Риба', calories: 116, protein: 25.5, fat: 0.8, carbs: 0 },
  { name: 'Хек варений', category: 'Риба', calories: 86, protein: 17.0, fat: 1.5, carbs: 0 },

  // ===== ЯЙЦЯ ТА МОЛОЧНІ ПРОДУКТИ =====
  { name: 'Яйце куряче варене', category: 'Яйця', calories: 155, protein: 12.6, fat: 10.6, carbs: 1.1 },
  { name: 'Яєчня з 2 яєць', category: 'Яйця', calories: 199, protein: 13.0, fat: 15.0, carbs: 1.5 },
  { name: 'Сир твердий', category: 'Молочні', calories: 364, protein: 23.0, fat: 30.0, carbs: 1.3 },
  { name: 'Сир кисломолочний 9%', category: 'Молочні', calories: 169, protein: 18.0, fat: 9.0, carbs: 3.0 },
  { name: 'Сир кисломолочний 5%', category: 'Молочні', calories: 121, protein: 17.0, fat: 5.0, carbs: 3.0 },
  { name: 'Сир кисломолочний 0%', category: 'Молочні', calories: 85, protein: 16.0, fat: 0.5, carbs: 4.0 },
  { name: 'Молоко 2.5%', category: 'Молочні', calories: 54, protein: 2.9, fat: 2.5, carbs: 4.8 },
  { name: 'Кефір 2.5%', category: 'Молочні', calories: 56, protein: 3.0, fat: 2.5, carbs: 4.0 },
  { name: 'Йогурт натуральний 2%', category: 'Молочні', calories: 60, protein: 5.0, fat: 2.0, carbs: 6.0 },
  { name: 'Грецький йогурт 2%', category: 'Молочні', calories: 73, protein: 10.0, fat: 2.0, carbs: 4.0 },
  { name: 'Масло вершкове', category: 'Молочні', calories: 717, protein: 0.9, fat: 81.0, carbs: 0.1 },

  // ===== ОВОЧІ =====
  { name: 'Огірок', category: 'Овочі', calories: 15, protein: 0.7, fat: 0.1, carbs: 3.6 },
  { name: 'Помідор', category: 'Овочі', calories: 18, protein: 0.9, fat: 0.2, carbs: 3.9 },
  { name: 'Перець болгарський', category: 'Овочі', calories: 31, protein: 1.0, fat: 0.3, carbs: 6.0 },
  { name: 'Морква', category: 'Овочі', calories: 41, protein: 0.9, fat: 0.2, carbs: 9.6 },
  { name: 'Капуста білокачанна', category: 'Овочі', calories: 25, protein: 1.3, fat: 0.1, carbs: 5.8 },
  { name: 'Капуста цвітна', category: 'Овочі', calories: 25, protein: 1.9, fat: 0.3, carbs: 4.9 },
  { name: 'Броколі', category: 'Овочі', calories: 34, protein: 2.8, fat: 0.4, carbs: 6.6 },
  { name: 'Кабачок', category: 'Овочі', calories: 17, protein: 1.2, fat: 0.3, carbs: 3.1 },
  { name: 'Баклажан', category: 'Овочі', calories: 25, protein: 1.0, fat: 0.2, carbs: 5.9 },
  { name: 'Цибуля ріпчаста', category: 'Овочі', calories: 40, protein: 1.1, fat: 0.1, carbs: 9.3 },
  { name: 'Часник', category: 'Овочі', calories: 149, protein: 6.4, fat: 0.5, carbs: 33.1 },
  { name: 'Картопля варена', category: 'Овочі', calories: 87, protein: 1.9, fat: 0.1, carbs: 20.1 },
  { name: 'Картопля смажена', category: 'Овочі', calories: 192, protein: 2.8, fat: 9.5, carbs: 23.4 },
  { name: 'Буряк варений', category: 'Овочі', calories: 44, protein: 1.7, fat: 0.2, carbs: 10.0 },
  { name: 'Гарбуз', category: 'Овочі', calories: 26, protein: 1.0, fat: 0.1, carbs: 6.5 },
  { name: 'Печериці', category: 'Овочі', calories: 22, protein: 3.1, fat: 0.3, carbs: 3.3 },

  // ===== ФРУКТИ =====
  { name: 'Яблуко', category: 'Фрукти', calories: 52, protein: 0.3, fat: 0.2, carbs: 13.8 },
  { name: 'Банан', category: 'Фрукти', calories: 89, protein: 1.1, fat: 0.3, carbs: 22.8 },
  { name: 'Апельсин', category: 'Фрукти', calories: 47, protein: 0.9, fat: 0.1, carbs: 11.8 },
  { name: 'Мандарин', category: 'Фрукти', calories: 53, protein: 0.8, fat: 0.3, carbs: 13.3 },
  { name: 'Грейпфрут', category: 'Фрукти', calories: 42, protein: 0.8, fat: 0.1, carbs: 10.7 },
  { name: 'Лимон', category: 'Фрукти', calories: 29, protein: 1.1, fat: 0.3, carbs: 9.3 },
  { name: 'Ківі', category: 'Фрукти', calories: 61, protein: 1.1, fat: 0.5, carbs: 14.7 },
  { name: 'Полуниця', category: 'Фрукти', calories: 32, protein: 0.7, fat: 0.3, carbs: 7.7 },
  { name: 'Малина', category: 'Фрукти', calories: 52, protein: 1.2, fat: 0.7, carbs: 11.9 },
  { name: 'Чорниця', category: 'Фрукти', calories: 57, protein: 0.7, fat: 0.3, carbs: 14.5 },
  { name: 'Виноград', category: 'Фрукти', calories: 69, protein: 0.7, fat: 0.2, carbs: 18.1 },
  { name: 'Кавун', category: 'Фрукти', calories: 30, protein: 0.6, fat: 0.2, carbs: 7.6 },
  { name: 'Диня', category: 'Фрукти', calories: 34, protein: 0.8, fat: 0.2, carbs: 8.2 },
  { name: 'Персик', category: 'Фрукти', calories: 39, protein: 0.9, fat: 0.3, carbs: 9.5 },
  { name: 'Груша', category: 'Фрукти', calories: 57, protein: 0.4, fat: 0.1, carbs: 15.2 },
  { name: 'Авокадо', category: 'Фрукти', calories: 160, protein: 2.0, fat: 14.7, carbs: 8.5 },

  // ===== ГОРІХИ ТА НАСІННЯ =====
  { name: 'Мигдаль', category: 'Горіхи', calories: 579, protein: 21.2, fat: 49.9, carbs: 21.6 },
  { name: 'Волоський горіх', category: 'Горіхи', calories: 654, protein: 15.2, fat: 65.2, carbs: 13.7 },
  { name: 'Фундук', category: 'Горіхи', calories: 628, protein: 15.0, fat: 60.8, carbs: 16.7 },
  { name: 'Арахіс', category: 'Горіхи', calories: 567, protein: 25.8, fat: 49.2, carbs: 16.1 },
  { name: 'Насіння соняшника', category: 'Горіхи', calories: 584, protein: 20.8, fat: 51.5, carbs: 20.0 },
  { name: 'Насіння чіа', category: 'Горіхи', calories: 486, protein: 16.5, fat: 30.7, carbs: 42.1 },
  { name: 'Насіння льону', category: 'Горіхи', calories: 534, protein: 18.3, fat: 42.2, carbs: 28.9 },

  // ===== ОЛІЇ ТА СОУСИ =====
  { name: 'Оливкова олія', category: 'Олії', calories: 884, protein: 0, fat: 100.0, carbs: 0 },
  { name: 'Соняшникова олія', category: 'Олії', calories: 884, protein: 0, fat: 100.0, carbs: 0 },
  { name: 'Кокосова олія', category: 'Олії', calories: 862, protein: 0, fat: 100.0, carbs: 0 },
  { name: 'Мед', category: 'Олії', calories: 304, protein: 0.3, fat: 0, carbs: 82.4 },
  { name: 'Соєвий соус', category: 'Олії', calories: 53, protein: 8.0, fat: 0.1, carbs: 4.9 },
  { name: 'Майонез', category: 'Олії', calories: 680, protein: 0.5, fat: 75.0, carbs: 2.0 },
  { name: 'Кетчуп', category: 'Олії', calories: 100, protein: 1.0, fat: 0.1, carbs: 24.0 },
];

// ========== ФУНКЦІЇ ПОШУКУ ==========
export function searchFoods(query: string): LocalFoodProduct[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return foodDatabase;
  
  return foodDatabase.filter((food) =>
    food.name.toLowerCase().includes(normalizedQuery) ||
    food.category.toLowerCase().includes(normalizedQuery)
  );
}

export function getFoodCategories(): string[] {
  const categories = new Set(foodDatabase.map((food) => food.category));
  return Array.from(categories);
}

export function getFoodsByCategory(category: string): LocalFoodProduct[] {
  return foodDatabase.filter((food) => food.category === category);
}