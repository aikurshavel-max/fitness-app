import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import FoodDiary from './pages/FoodDiary';
import Stats from './pages/Stats';
import Goals from './pages/Goals';
import Profile from './pages/Profile';
import Photos from './pages/Photos';
import Workouts from './pages/Workouts';
import BottomNav from './components/BottomNav';
import { db } from './db/database';

export default function App() {
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    db.open()
      .then(() => {
        return db.userProfile.count();
      })
      .then((count) => {
        setHasProfile(count > 0);
      })
      .catch((err) => {
        console.error('Помилка бази даних:', err);
        setHasProfile(false);
      });
  }, []);

  if (hasProfile === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Завантаження...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="pb-16 min-h-screen">
        <Routes>
          {hasProfile ? (
            <>
              <Route path="/" element={<Dashboard />} />
              <Route path="/diary" element={<FoodDiary />} />
              <Route path="/workouts" element={<Workouts />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/photos" element={<Photos />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/profile" element={<Profile />} />
            </>
          ) : (
            <Route path="*" element={<Profile onProfileSaved={() => setHasProfile(true)} />} />
          )}
        </Routes>
        {hasProfile && <BottomNav />}
      </div>
    </BrowserRouter>
  );
}