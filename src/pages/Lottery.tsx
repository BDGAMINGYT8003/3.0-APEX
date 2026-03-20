import React, { useEffect, useState, useMemo } from 'react';
import { useAuth, handleFirestoreError, OperationType } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'motion/react';
import { Ticket, History, Gift, Users, Clock, Medal, TrendingUp, Info } from 'lucide-react';

interface LotteryHistory {
  id: string;
  month: string;
  winners: { rank: number; id: string; displayName: string; prize: string }[];
  totalTickets: number;
  totalParticipants: number;
}

interface LotteryStats {
  totalTickets: number;
  totalParticipants: number;
}

export function Lottery() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<LotteryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<LotteryStats>({ totalTickets: 0, totalParticipants: 0 });
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Prize Tiers Data (Mocked as requested for "Current Lottery Rewards" section)
  const currentPrizes = [
    {
      rank: 1,
      title: 'Grand Prize',
      reward: 'Exclusive Mythic Skin + 50,000 CI',
      icon: Medal,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20'
    },
    {
      rank: 2,
      title: 'Runner Up',
      reward: 'Legendary Item Pack + 25,000 CI',
      icon: Medal,
      color: 'text-slate-400',
      bgColor: 'bg-slate-400/10',
      borderColor: 'border-slate-400/20'
    },
    {
      rank: 3,
      title: 'Third Place',
      reward: 'Rare Item Bundle + 10,000 CI',
      icon: Medal,
      color: 'text-amber-600',
      bgColor: 'bg-amber-600/10',
      borderColor: 'border-amber-600/20'
    }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch History
        const qHistory = query(collection(db, 'lottery_history'), orderBy('month', 'desc'), limit(12));
        let historySnapshot;
        try {
          historySnapshot = await getDocs(qHistory);
        } catch (e) {
          handleFirestoreError(e, OperationType.LIST, 'lottery_history');
          return;
        }
        const fetchedHistory: LotteryHistory[] = [];
        historySnapshot.forEach((doc) => {
          fetchedHistory.push({ id: doc.id, ...doc.data() } as LotteryHistory);
        });
        setHistory(fetchedHistory);

        // Fetch Current Stats (Aggregate from users)
        // In a production app, this would be a single document updated by a cloud function
        const qStats = query(collection(db, 'users'), where('lottery.current_tickets', '>', 0));
        let statsSnapshot;
        try {
          statsSnapshot = await getDocs(qStats);
        } catch (e) {
          handleFirestoreError(e, OperationType.LIST, 'users');
          return;
        }
        let totalTickets = 0;
        let totalParticipants = 0;
        statsSnapshot.forEach((doc) => {
          const data = doc.data();
          totalTickets += data.lottery?.current_tickets || 0;
          totalParticipants += 1;
        });
        setStats({ totalTickets, totalParticipants });

      } catch (error) {
        // Errors are already handled by handleFirestoreError or caught here if not Firestore related
        console.error("Error fetching lottery data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Countdown Timer Logic (Eastern Time)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      
      // Get current date in ET
      const etString = now.toLocaleString("en-US", { timeZone: "America/New_York" });
      const etNow = new Date(etString);
      
      // Calculate end of current month in ET
      const year = etNow.getFullYear();
      const month = etNow.getMonth();
      const lastDay = new Date(year, month + 1, 0, 23, 59, 59); // End of month at 23:59:59
      
      // We need to compare UTC times to get the difference
      // Convert lastDay (which is local to ET) back to a timestamp
      // Actually, it's easier to just calculate the difference in milliseconds
      const diff = lastDay.getTime() - etNow.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const winPercentage = useMemo(() => {
    if (!profile || stats.totalTickets === 0) return 0;
    const userTickets = profile.lottery?.current_tickets || 0;
    return ((userTickets / stats.totalTickets) * 100).toFixed(4);
  }, [profile, stats.totalTickets]);

  if (!profile) return null;

  const totalWins = (profile.lottery?.wins?.first || 0) + (profile.lottery?.wins?.second || 0) + (profile.lottery?.wins?.third || 0);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Apex Monthly Lottery
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Purchase tickets in the Market to increase your chances of winning exclusive in-game items.
          </p>
        </div>
        
        {/* Countdown Card */}
        <Card className="w-full md:w-auto min-w-[300px] border-[#E91E63]/20 bg-[#E91E63]/5">
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E91E63] text-white">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#E91E63]">Lottery Ends In</p>
              <div className="flex items-baseline space-x-1">
                <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                  {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prize Tiers Section */}
      <section className="space-y-4">
        <div className="flex items-center space-x-2">
          <Gift className="h-5 w-5 text-[#E91E63]" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Current Lottery Rewards</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {currentPrizes.map((prize, i) => (
            <motion.div
              key={prize.rank}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`h-full border-2 ${prize.borderColor} ${prize.bgColor} relative overflow-hidden group`}>
                <div className="absolute -right-4 -top-4 opacity-10 transition-transform group-hover:scale-110">
                  <prize.icon size={120} />
                </div>
                <CardContent className="p-6 flex flex-col items-center text-center relative z-10">
                  <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md dark:bg-slate-900 ${prize.color}`}>
                    <prize.icon className="h-8 w-8" />
                  </div>
                  <span className={`text-xs font-black uppercase tracking-widest ${prize.color}`}>
                    {prize.rank === 1 ? '1st Place' : prize.rank === 2 ? '2nd Place' : '3rd Place'}
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{prize.title}</h3>
                  <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                    {prize.reward}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E91E63]/10">
              <Ticket className="h-6 w-6 text-[#E91E63]" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Your Entries</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {profile.lottery?.current_tickets || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Participants</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.totalParticipants}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-indigo-500/5 border-indigo-500/20">
          <CardContent className="flex items-center p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10">
              <TrendingUp className="h-6 w-6 text-indigo-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Win Chance</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {winPercentage}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Personal Stats & History */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="mr-2 h-5 w-5 text-[#E91E63]" />
                Lottery History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E91E63] border-t-transparent" />
                </div>
              ) : history.length > 0 ? (
                <div className="space-y-6">
                  {history.map((record, i) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-6 dark:border-slate-800/50 dark:bg-slate-800/20"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {record.month}
                        </h3>
                        <div className="flex space-x-4 text-sm text-slate-500 dark:text-slate-400">
                          <span>{record.totalParticipants} Participants</span>
                          <span>{record.totalTickets} Tickets</span>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {record.winners.map((winner) => (
                          <div key={winner.rank} className="flex flex-col items-center rounded-lg bg-white p-4 shadow-sm dark:bg-[#111111] dark:border dark:border-slate-800">
                            <span className={`text-2xl font-bold ${
                              winner.rank === 1 ? 'text-yellow-500' :
                              winner.rank === 2 ? 'text-slate-400' :
                              'text-amber-600'
                            }`}>
                              {winner.rank === 1 ? '1st' : winner.rank === 2 ? '2nd' : '3rd'}
                            </span>
                            <span className="mt-2 text-sm font-semibold text-slate-900 dark:text-white text-center">
                              {winner.displayName}
                            </span>
                            <span className="mt-1 text-xs text-slate-500 dark:text-slate-400 text-center">
                              {winner.prize}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <History className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="mt-4 text-lg font-medium text-slate-900 dark:text-white">No History Available</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Past lottery results will appear here once a lottery concludes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Gift className="mr-2 h-5 w-5 text-yellow-500" />
                Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span className="text-sm text-slate-500 dark:text-slate-400">Lifetime Tickets</span>
                <span className="font-bold text-slate-900 dark:text-white">{profile.lottery?.lifetime_tickets || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span className="text-sm text-slate-500 dark:text-slate-400">Total Wins</span>
                <span className="font-bold text-slate-900 dark:text-white">{totalWins}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span className="text-sm text-slate-500 dark:text-slate-400">Lotteries Joined</span>
                <span className="font-bold text-slate-900 dark:text-white">{profile.lottery?.joined || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardHeader>
              <CardTitle className="flex items-center text-emerald-600 dark:text-emerald-400">
                <Info className="mr-2 h-5 w-5" />
                How it works
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-400 space-y-3">
              <p>1. Buy tickets from the Market using CI Tokens.</p>
              <p>2. Each ticket is one entry into the monthly draw.</p>
              <p>3. Winners are selected randomly at the end of each month.</p>
              <p>4. Prizes are delivered to your in-game mailbox via UID.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
