// ========== РОЗПІЗНАВАННЯ ЇЖІ (Google Gemini AI + локальний fallback) ==========

import { foodDatabase } from '../data/foodDatabase';

export interface RecognizedFood {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  healthScore: number;
  recommendation: string; // "можна" | "помірно" | "обмежити"
  confidence: number;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Пошук найбільш схожого продукту в локальній базі
function findClosestFood(name: string) {
  const lowerName = name.toLowerCase().trim();
  const cleanName = lowerName.replace(/[^a-zа-яіїєґ0-9\s-]/gi, '');
  const words = cleanName.split(/[\s,.-]+/).filter((w) => w.length > 2);

  for (const word of words) {
    const match = foodDatabase.find((food) => food.name.toLowerCase().includes(word));
    if (match) return match;
  }
  const directMatch = foodDatabase.find((food) => food.name.toLowerCase().includes(cleanName));
  return directMatch || null;
}

// Витягує значення з часткового JSON за допомогою регулярних виразів
function extractFromPartialJson(text: string): Partial<RecognizedFood> | null {
  const result: Partial<RecognizedFood> = {};

  const nameMatch = text.match(/"name"\s*:\s*"([^"]*)"/);
  const caloriesMatch = text.match(/"calories"\s*:\s*(\d+)/);
  const proteinMatch = text.match(/"protein"\s*:\s*(\d+(?:\.\d+)?)/);
  const fatMatch = text.match(/"fat"\s*:\s*(\d+(?:\.\d+)?)/);
  const carbsMatch = text.match(/"carbs"\s*:\s*(\d+(?:\.\d+)?)/);
  const healthScoreMatch = text.match(/"healthScore"\s*:\s*(\d+(?:\.\d+)?)/);
  const recommendationMatch = text.match(/"recommendation"\s*:\s*"([^"]*)"/);
  const confidenceMatch = text.match(/"confidence"\s*:\s*(\d+(?:\.\d+)?)/);

  if (nameMatch) result.name = nameMatch[1];
  if (caloriesMatch) result.calories = Number(caloriesMatch[1]);
  if (proteinMatch) result.protein = Number(proteinMatch[1]);
  if (fatMatch) result.fat = Number(fatMatch[1]);
  if (carbsMatch) result.carbs = Number(carbsMatch[1]);
  if (healthScoreMatch) result.healthScore = Number(healthScoreMatch[1]);
  if (recommendationMatch) result.recommendation = recommendationMatch[1];
  if (confidenceMatch) result.confidence = Number(confidenceMatch[1]);

  // Повертаємо null, якщо нічого не знайдено
  if (!result.name && !result.calories) return null;
  return result;
}

export async function analyzeFoodImage(imageBlob: Blob): Promise<RecognizedFood> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('API ключ не знайдено. Перевір файл .env.local');
  }

  const base64Image = await blobToBase64(imageBlob);

  const prompt = `Ти — експерт з харчування. Подивись на фото їжі та поверни ВИКЛЮЧНО JSON-об'єкт без жодних додаткових символів, пояснень чи markdown-розмітки.

Формат:
{
  "name": "назва страви",
  "calories": число (калорій на 100г),
  "protein": число (білки на 100г),
  "fat": число (жири на 100г),
  "carbs": число (вуглеводи на 100г),
  "healthScore": число від 1 до 10 (10 = дуже корисно),
  "recommendation": "можна" або "помірно" або "обмежити",
  "confidence": число від 0 до 1 (впевненість)
}

Якщо не можеш розпізнати, поверни:
{
  "name": "Невідома страва",
  "calories": 0,
  "protein": 0,
  "fat": 0,
  "carbs": 0,
  "healthScore": 5,
  "recommendation": "помірно",
  "confidence": 0
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024, // ще більше
          responseMimeType: 'application/json', // змушуємо модель повертати JSON
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Помилка API: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const content = result?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error('Немає відповіді від AI');
  }

  // 1. Спроба строгого парсингу JSON
  try {
    const parsed = JSON.parse(content);
    const normalizeRecommendation = (rec: string): string => {
      const r = rec?.toLowerCase().trim();
      if (r === 'можна' || r === 'можно' || r === 'can' || r === 'yes') return 'можна';
      if (r === 'помірно' || r === 'умеренно' || r === 'moderate' || r === 'medium') return 'помірно';
      if (r === 'обмежити' || r === 'избегать' || r === 'avoid' || r === 'limit' || r === 'no') return 'обмежити';
      return 'помірно';
    };

    return {
      name: parsed.name || 'Невідома страва',
      calories: Number(parsed.calories) || 0,
      protein: Number(parsed.protein) || 0,
      fat: Number(parsed.fat) || 0,
      carbs: Number(parsed.carbs) || 0,
      healthScore: Math.max(1, Math.min(10, Number(parsed.healthScore) || 5)),
      recommendation: normalizeRecommendation(parsed.recommendation),
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
    };
  } catch (jsonError) {
    // 2. Спроба витягти дані з часткового JSON
    console.warn('JSON не повний, пробуємо витягти частково. Відповідь:', content);
    const partial = extractFromPartialJson(content);
    if (partial && partial.name) {
      const normalizeRec = (rec: string): string => {
        const r = rec?.toLowerCase().trim();
        if (r === 'можна' || r === 'можно' || r === 'can' || r === 'yes') return 'можна';
        if (r === 'помірно' || r === 'умеренно' || r === 'moderate' || r === 'medium') return 'помірно';
        if (r === 'обмежити' || r === 'избегать' || r === 'avoid' || r === 'limit' || r === 'no') return 'обмежити';
        return 'помірно';
      };

      const name = partial.name || 'Невідома страва';
      const matchedFood = findClosestFood(name);
      if (matchedFood && !partial.calories) {
        // Якщо калорії не розпізнали, але знайшли схожий продукт — використовуємо його
        return {
          name: matchedFood.name,
          calories: matchedFood.calories,
          protein: matchedFood.protein,
          fat: matchedFood.fat,
          carbs: matchedFood.carbs,
          healthScore: matchedFood.calories < 150 ? 8 : matchedFood.calories < 300 ? 6 : 4,
          recommendation: matchedFood.calories < 150 ? 'можна' : matchedFood.calories < 300 ? 'помірно' : 'обмежити',
          confidence: partial.confidence || 0.4,
        };
      }

      return {
        name,
        calories: partial.calories || 0,
        protein: partial.protein || 0,
        fat: partial.fat || 0,
        carbs: partial.carbs || 0,
        healthScore: Math.max(1, Math.min(10, partial.healthScore || 5)),
        recommendation: normalizeRec(partial.recommendation || 'помірно'),
        confidence: Math.max(0, Math.min(1, partial.confidence || 0.5)),
      };
    }

    // 3. Останній fallback
    const rawText = content.trim();
    let name = rawText.slice(0, 60).replace(/[^a-zа-яіїєґ0-9\s-]/gi, '').trim();
    if (!name) name = 'Невідома страва';

    const matchedFood = findClosestFood(name);
    if (matchedFood) {
      return {
        name: matchedFood.name,
        calories: matchedFood.calories,
        protein: matchedFood.protein,
        fat: matchedFood.fat,
        carbs: matchedFood.carbs,
        healthScore: matchedFood.calories < 150 ? 8 : matchedFood.calories < 300 ? 6 : 4,
        recommendation: matchedFood.calories < 150 ? 'можна' : matchedFood.calories < 300 ? 'помірно' : 'обмежити',
        confidence: 0.3,
      };
    }

    return {
      name,
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      healthScore: 5,
      recommendation: 'помірно',
      confidence: 0,
    };
  }
}