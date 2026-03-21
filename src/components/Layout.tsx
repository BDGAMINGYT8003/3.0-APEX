import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, ShoppingCart, Trophy, Ticket, LogOut, Menu, X, Shield, Search, ChevronDown } from 'lucide-react';

export function Layout() {
  const { user, profile, signOut, isOnline } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.email === 'xdjameherobrine@gmail.com';

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Market', path: '/market', icon: ShoppingCart },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { name: 'Lottery', path: '/lottery', icon: Ticket },
  ];

  const displayAvatar = profile?.avatar_preference === 'discord' && profile?.discord_avatar 
    ? profile.discord_avatar 
    : profile?.photoURL || 'https://picsum.photos/seed/avatar/100/100';

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800/50 dark:bg-[#111111] md:flex">
        <div className="flex h-16 items-center px-6 border-b border-slate-100 dark:border-slate-800/50">
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#E91E63] to-purple-500">
            Apex Girls
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6">
          <nav className="space-y-1 px-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#E91E63]/10 text-[#E91E63] dark:bg-[#E91E63]/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      isActive ? 'text-[#E91E63]' : 'text-slate-400 group-hover:text-slate-500 dark:text-slate-500'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}

            {isAdmin && (
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/50">
                <button
                  onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                  className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isAdminMenuOpen || location.pathname.startsWith('/admin')
                      ? 'text-[#E91E63]'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center">
                    <Shield className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      isAdminMenuOpen || location.pathname.startsWith('/admin') ? 'text-[#E91E63]' : 'text-slate-400 dark:text-slate-500'
                    }`} />
                    Administrator
                  </div>
                  <motion.div
                    animate={{ rotate: isAdminMenuOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={16} />
                  </motion.div>
                </button>
                
                <AnimatePresence>
                  {isAdminMenuOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1 ml-4 space-y-1 border-l-2 border-slate-100 dark:border-slate-800/50 pl-4">
                        <Link
                          to="/admin/search"
                          className={`group flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                            location.pathname === '/admin/search'
                              ? 'text-[#E91E63]'
                              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                          }`}
                        >
                          <Search className="mr-3 h-4 w-4" />
                          Search
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </nav>
        </div>

        <div className="border-t border-slate-200 p-4 dark:border-slate-800/50">
          <div className="flex items-center justify-between">
            <Link to="/profile" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <img
                src={displayAvatar}
                alt="Avatar"
                className="h-10 w-10 rounded-full border-2 border-slate-200 dark:border-slate-700"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate w-24">
                  {profile?.displayName}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Lvl {profile?.level || 1}
                </span>
              </div>
            </Link>
            <button
              onClick={signOut}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#111111] shadow-xl md:hidden flex flex-col"
            >
              <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800/50">
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#E91E63] to-purple-500">
                  Apex Girls
                </span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-6">
                <nav className="space-y-1 px-4">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-[#E91E63]/10 text-[#E91E63] dark:bg-[#E91E63]/20'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100'
                        }`}
                      >
                        <item.icon
                          className={`mr-3 h-5 w-5 flex-shrink-0 ${
                            isActive ? 'text-[#E91E63]' : 'text-slate-400 group-hover:text-slate-500 dark:text-slate-500'
                          }`}
                        />
                        {item.name}
                      </Link>
                    );
                  })}

                  {isAdmin && (
                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/50">
                      <button
                        onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                        className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                          isAdminMenuOpen || location.pathname.startsWith('/admin')
                            ? 'text-[#E91E63]'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100'
                        }`}
                      >
                        <div className="flex items-center">
                          <Shield className={`mr-3 h-5 w-5 flex-shrink-0 ${
                            isAdminMenuOpen || location.pathname.startsWith('/admin') ? 'text-[#E91E63]' : 'text-slate-400 dark:text-slate-500'
                          }`} />
                          Administrator
                        </div>
                        <motion.div
                          animate={{ rotate: isAdminMenuOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown size={16} />
                        </motion.div>
                      </button>
                      
                      <AnimatePresence>
                        {isAdminMenuOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-1 ml-4 space-y-1 border-l-2 border-slate-100 dark:border-slate-800/50 pl-4">
                              <Link
                                to="/admin/search"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`group flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                                  location.pathname === '/admin/search'
                                    ? 'text-[#E91E63]'
                                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                                }`}
                              >
                                <Search className="mr-3 h-4 w-4" />
                                Search
                              </Link>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </nav>
              </div>
              <div className="border-t border-slate-200 p-4 dark:border-slate-800/50">
                <div className="flex items-center justify-between">
                  <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                    <img
                      src={displayAvatar}
                      alt="Avatar"
                      className="h-10 w-10 rounded-full border-2 border-slate-200 dark:border-slate-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate w-24">
                        {profile?.displayName}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Lvl {profile?.level || 1}
                      </span>
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      signOut();
                    }}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-red-500 text-white px-6 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 z-[60]"
            >
              <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
              Connection lost. Operating in offline mode.
            </motion.div>
          )}
        </AnimatePresence>
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800/50 dark:bg-[#111111] md:justify-end">
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="mr-4 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <Menu size={24} />
            </button>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#E91E63] to-purple-500">
              Apex Girls
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Balance</span>
              <span className="text-sm font-bold text-[#E91E63]">{profile?.tokens || 0} CI</span>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <div 
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto p-6 lg:p-10"
        >
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mx-auto max-w-5xl"
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
