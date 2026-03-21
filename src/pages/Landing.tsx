import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { motion } from 'motion/react';
import { Shield, Zap, Trophy, AlertCircle } from 'lucide-react';

export function Landing() {
  const { user, profile, signIn, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E91E63] border-t-transparent" />
      </div>
    );
  }

  if (user) {
    if (profile && !profile.isDiscordVerified) {
      return <Navigate to="/verify" replace />;
    }
    if (profile && profile.isDiscordVerified) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#0a0a0a]">
      <header className="flex h-20 items-center justify-between px-6 lg:px-12 border-b border-slate-200 dark:border-slate-800/50 bg-white/50 dark:bg-[#111111]/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <Shield className="h-8 w-8 text-[#E91E63]" />
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#E91E63] to-purple-500">
            Apex Girls
          </span>
        </div>
        <Button onClick={signIn} variant="primary" className="px-6">
          Get Started
        </Button>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden py-20 lg:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-8 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl"
              >
                <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl lg:text-7xl">
                  Dominate the <span className="text-[#E91E63]">Apex Grid</span>
                </h1>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-500"
                  >
                    <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                  </motion.div>
                )}
                <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-400">
                  Connect your Discord profile, track your stats, purchase exclusive items in the market, and climb the monthly leaderboards.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <Button onClick={signIn} size="lg" className="w-full sm:w-40 shadow-lg shadow-[#E91E63]/20">
                    Sign In
                  </Button>
                  <Button onClick={signIn} variant="secondary" size="lg" className="w-full sm:w-40">
                    Log In
                  </Button>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative"
              >
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-800/50">
                  <img
                    src="https://picsum.photos/seed/apex/800/600"
                    alt="Dashboard Preview"
                    className="object-cover w-full h-full opacity-90"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/80 to-transparent mix-blend-multiply" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-white dark:bg-[#111111]">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
              {[
                {
                  title: 'Real-time Sync',
                  description: 'Your Discord activity instantly syncs with your web profile.',
                  icon: Zap,
                },
                {
                  title: 'Monthly Leaderboards',
                  description: 'Compete with other agents for exclusive rewards and glory.',
                  icon: Trophy,
                },
                {
                  title: 'Secure Marketplace',
                  description: 'Spend your CI tokens securely on in-game items and lottery tickets.',
                  icon: Shield,
                },
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex flex-col items-start"
                >
                  <div className="rounded-xl bg-[#E91E63]/10 p-4 dark:bg-[#E91E63]/20">
                    <feature.icon className="h-6 w-6 text-[#E91E63]" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-slate-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-slate-600 dark:text-slate-400">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
