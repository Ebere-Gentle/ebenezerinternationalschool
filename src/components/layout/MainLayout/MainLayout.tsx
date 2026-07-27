import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X, LayoutDashboard, Users, GraduationCap, CreditCard, Coins, BookOpen, Building2, BarChart3, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../contexts/ThemeContext';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../../routes/RouteConstants';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const location = useLocation();

  const navigation = [
    { label: 'Dashboard', icon: LayoutDashboard, path: ROUTES.DASHBOARD },
    { label: 'Students', icon: Users, path: ROUTES.STUDENTS },
    { label: 'Teachers', icon: GraduationCap, path: ROUTES.TEACHERS },
    { label: 'Payments', icon: CreditCard, path: ROUTES.PAYMENTS },
    { label: 'Fees', icon: Coins, path: ROUTES.FEES },
    { label: 'Classes', icon: BookOpen, path: ROUTES.CLASSES },
    { label: 'Branches', icon: Building2, path: ROUTES.BRANCHES },
    { label: 'Reports', icon: BarChart3, path: ROUTES.REPORTS },
    { label: 'Settings', icon: Settings, path: ROUTES.SETTINGS },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <div className={`flex items-center gap-2 ${sidebarOpen ? '' : 'justify-center w-full'}`}>
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">EIS</span>
            </div>
            {sidebarOpen && (
              <span className="text-lg font-bold text-gray-900 dark:text-white">EIS Portal</span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                isActive(item.path)
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {navigation.find(item => isActive(item.path))?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              {user?.email && (
                <span className="text-sm text-gray-700 dark:text-gray-300 hidden md:block">
                  {user.email}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
