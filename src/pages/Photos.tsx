import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../db/database';
import { Camera, Trash2, X, ZoomIn } from 'lucide-react';

export default function Photos() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [note, setNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = useCallback(async () => {
    const entries = await db.photoEntries.orderBy('date').reverse().toArray();
    // Створюємо URL для відображення
    const photosWithUrls = entries.map((entry) => ({
      ...entry,
      url: URL.createObjectURL(entry.blob),
      thumbnailUrl: URL.createObjectURL(entry.thumbnail),
    }));
    setPhotos(photosWithUrls);
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Обробка вибору фото
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Стиснення фото
    const compressed = await compressImage(file);
    const thumbnail = await createThumbnail(compressed);

    await db.photoEntries.add({
      date: new Date().toISOString().split('T')[0],
      blob: compressed,
      thumbnail,
      note: note || undefined,
      createdAt: new Date().toISOString(),
    });

    setNote('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    await loadPhotos();
  };

  // Стиснення зображення
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 800;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Помилка стиснення'));
          }, 'image/jpeg', 0.8);
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Створення мініатюри
  const createThumbnail = (blob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 200;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Помилка створення мініатюри'));
          }, 'image/jpeg', 0.6);
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Видалити фото?')) {
      await db.photoEntries.delete(id);
      await loadPhotos();
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Фото прогресу</h1>

      {/* Форма додавання */}
      <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-3 text-sm"
          placeholder="Нотатка (наприклад, 'Тиждень 1')"
        />
        <input
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileSelect}
          ref={fileInputRef}
          className="hidden"
          id="photo-upload"
        />
        <label
          htmlFor="photo-upload"
          className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Camera size={20} />
          Зробити фото
        </label>
      </div>

      {/* Галерея */}
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group">
            <img
              src={photo.thumbnailUrl}
              alt={photo.note || 'Фото прогресу'}
              className="w-full h-32 object-cover rounded-lg cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            />
            <button
              onClick={() => handleDelete(photo.id!)}
              className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 text-gray-500 hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {photos.length === 0 && (
        <div className="text-center py-12">
          <Camera size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Фото прогресу з'являться тут</p>
          <p className="text-gray-300 text-sm mt-1">Фотографуй себе щотижня!</p>
        </div>
      )}

      {/* Перегляд фото */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="max-w-full max-h-full p-4">
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.note || 'Фото прогресу'}
              className="max-w-full max-h-[80vh] object-contain"
            />
            <div className="text-center mt-3">
              <p className="text-white text-sm">{selectedPhoto.date}</p>
              {selectedPhoto.note && (
                <p className="text-gray-300 text-sm mt-1">{selectedPhoto.note}</p>
              )}
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              <X size={32} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}