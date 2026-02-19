import { Routes, Route, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Dashboard from '@/pages/Dashboard';
import Runs from '@/pages/Runs';
import Stats from '@/pages/Stats';
import Parkrun from '@/pages/Parkrun';
import Settings from '@/pages/Settings';

function App() {
  const navItems = [
    { label: 'Dashboard', to: '/' },
    { label: 'Runs', to: '/runs' },
    { label: 'Stats', to: '/stats' },
    { label: 'Parkrun', to: '/parkrun' },
    { label: 'Settings', to: '/settings' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold">Running Dashboard</h1>
          <nav className="flex space-x-2">
            {navItems.map(item => (
              <Link key={item.to} to={item.to}>
                <Button variant="ghost">{item.label}</Button>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/runs" element={<Runs />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/parkrun" element={<Parkrun />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
