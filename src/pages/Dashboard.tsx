import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { getXpForNextLevel } from '../lib/constants';
import { motion } from 'motion/react';
import { Trophy, Coins, Star, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { profile } = useAuth();

  if (!profile) return null;

  const nextXp = getXpForNextLevel(profile.level);
  const progress = Math.min((profile.xp / nextXp) * 100, 100);

  const stats = [
    { label: 'Level', value: profile.level, icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { label: 'CI Tokens', value: profile.tokens, icon: Coins, color: 'text-[#E91E63]', bg: 'bg-[#E91E63]/10' },
    { label: 'Total XP', value: profile.total_xp, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Lottery Tickets', value: profile.lottery?.current_tickets || 0, icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  const formatTimestamp = (timestamp: string | number) => {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} · ${hours}:${minutes}`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Welcome back, {profile.displayName}
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Here's your current status in the Apex Grid.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="flex items-center p-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Level Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm font-medium mb-2">
            <span className="text-slate-600 dark:text-slate-400">Level {profile.level}</span>
            <span className="text-slate-900 dark:text-white">{profile.xp} / {nextXp} XP</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-[#E91E63] to-purple-500"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            {profile.activity_log && profile.activity_log.length > 5 && (
              <Link 
                to="/recent-activity" 
                className="text-sm font-medium text-violet-600 dark:text-violet-400 underline hover:opacity-80 transition-opacity"
              >
                View All
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {profile.activity_log && profile.activity_log.length > 0 ? (
              <div className="space-y-3">
                {profile.activity_log.slice(-5).reverse().map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                        {activity.reason.startsWith('Granted by') ? 'Granted by Admin' : activity.reason}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-emerald-500">
                      +{activity.amount} CI
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No recent activity recorded.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Purchase History</CardTitle>
            {profile.purchase_history && profile.purchase_history.length > 5 && (
              <Link 
                to="/purchase-history" 
                className="text-sm font-medium text-violet-600 dark:text-violet-400 underline hover:opacity-80 transition-opacity"
              >
                View All
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {profile.purchase_history && profile.purchase_history.length > 0 ? (
              <div className="space-y-3">
                {profile.purchase_history.slice(-5).reverse().map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                        {item.itemName.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {new Date(item.timestamp).toLocaleDateString()} · {item.amount}x
                      </span>
                    </div>
                    <span className="text-sm font-bold text-[#E91E63]">
                      -{item.tokensUsed} CI
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No purchases yet. Visit the Market to browse items.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
