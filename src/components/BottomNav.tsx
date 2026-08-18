import { NavLink } from 'react-router-dom';
import { Home, Utensils, Dumbbell, BarChart3, Target, User, Camera, HelpCircle } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Сьогодні', icon: Home },
  { to: '/diary', label: 'Їжа', icon: Utensils },
  { to: '/workouts', label: 'Спорт', icon: Dumbbell },
  { to: '/stats', label: 'Статистика', icon: BarChart3 },
  { to: '/photos', label: 'Фото', icon: Camera },
  { to: '/goals', label: 'Цілі', icon: Target },
  { to: '/profile', label: 'Профіль', icon: User },
  { to: '/help', label: 'Допомога', icon: HelpCircle },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 shadow-lg z-50 overflow-x-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 min-w-[56px] h-full transition-colors ${
                isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <Icon size={22} />
            <span className="text-xs mt-1 whitespace-nowrap">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}