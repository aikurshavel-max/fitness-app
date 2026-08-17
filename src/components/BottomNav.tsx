import { NavLink } from 'react-router-dom';
import { Home, Utensils, BarChart3, Target, User, Camera } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Сьогодні', icon: Home },
  { to: '/diary', label: 'Їжа', icon: Utensils },
  { to: '/stats', label: 'Статистика', icon: BarChart3 },
  { to: '/photos', label: 'Фото', icon: Camera },
  { to: '/goals', label: 'Цілі', icon: Target },
  { to: '/profile', label: 'Профіль', icon: User },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 shadow-lg z-50">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <Icon size={22} />
            <span className="text-xs mt-1">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}