import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, handleFirestoreError, OperationType, UserProfile } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { getXpForNextLevel } from '../lib/constants';
import { motion } from 'motion/react';
import { Trophy, Medal, Crown } from 'lucide-react';

interface LeaderboardUser extends UserProfile {}

export function Leaderboard() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('level', 'desc'), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedUsers: LeaderboardUser[] = [];
      snapshot.forEach((doc) => {
        fetchedUsers.push(doc.data() as LeaderboardUser);
      });

      // Primary sort: Level (desc), XP (desc)
      // Secondary sort: Username (asc)
      fetchedUsers.sort((a, b) => {
        const levelA = a.level || 1;
        const levelB = b.level || 1;
        const xpA = a.xp || 0;
        const xpB = b.xp || 0;

        if (levelB !== levelA) {
          return levelB - levelA;
        }
        if (xpB !== xpA) {
          return xpB - xpA;
        }
        return (a.displayName || '').localeCompare(b.displayName || '');
      });

      setUsers(fetchedUsers);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getAvatarUrl = (user: LeaderboardUser) => {
    if (user.avatar_preference === 'discord' && user.discord_avatar) {
      return user.discord_avatar;
    }
    return user.photoURL || 'https://picsum.photos/seed/avatar/100/100';
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E91E63] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Global Leaderboard
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          The top agents in the Apex Grid based on Total XP.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span>Top 50 Agents</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {users.map((user, index) => {
              const nextXp = getXpForNextLevel(user.level);
              const progress = Math.min((user.xp / nextXp) * 100, 100);

              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center p-4 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                >
                  <div className="flex w-12 justify-center">
                    {index === 0 ? (
                      <Crown className="h-6 w-6 text-yellow-500" />
                    ) : index === 1 ? (
                      <Medal className="h-6 w-6 text-slate-400" />
                    ) : index === 2 ? (
                      <Medal className="h-6 w-6 text-amber-600" />
                    ) : (
                      <span className="text-lg font-bold text-slate-400 dark:text-slate-500">
                        #{index + 1}
                      </span>
                    )}
                  </div>
                  
                  <div className="ml-4 flex items-center space-x-4 flex-1">
                    <img
                      src={getAvatarUrl(user)}
                      alt={user.displayName}
                      className="h-10 w-10 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        {user.displayName}
                      </h4>
                      <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>Lvl {user.level} • {user.xp.toLocaleString()} XP</span>
                      </div>
                    </div>
                  </div>

                  <div className="hidden md:block w-48 ml-4">
                    <div className="flex items-center justify-between text-xs font-medium mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Progress</span>
                      <span className="text-slate-700 dark:text-slate-300">{user.xp}/{nextXp}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-[#E91E63] to-purple-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
