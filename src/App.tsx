import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import FoodDiary from './pages/FoodDiary';
import Stats from './pages/Stats';
import Goals from './pages/Goals';
import Profile from './pages/Profile';
import BottomNav from './components/BottomNav';
import { db } from './db/database';

export default function App() {
  useEffect(() => {
    db.open()
      .then(() => console.log('✅ База даних Dexie відкрита'))
      .catch((err) => console.error('❌ Помилка бази даних:', err));
  }, []);

  return (
    <BrowserRouter>
      <div className="pb-16 min-h-screen">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/diary" element={<FoodDiary />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}