import { Routes, Route, NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Dashboard from '@/pages/Dashboard';
import Runs from '@/pages/Runs';
import Stats from '@/pages/Stats';
import Parkrun from '@/pages/Parkrun';
import Settings from '@/pages/Settings';
import Recommendations from '@/pages/Recommendations';
import Calendar from '@/pages/Calendar';

function App() {
  const navItems = [
    { label: 'Dashboard', to: '/' },
    { label: 'Runs', to: '/runs' },
    { label: 'Stats', to: '/stats' },
    { label: 'Parkrun', to: '/parkrun' },
    { label: 'Recommendations', to: '/recommendations' },
    { label: 'Settings', to: '/settings' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
            Running Dashboard
          </h1>
          <nav className="flex space-x-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/runs" element={<Runs />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/parkrun" element={<Parkrun />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
