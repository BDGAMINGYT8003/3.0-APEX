import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Navigate, useParams } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Search, User, Mail, Shield, Calendar, Trophy, Coins, Activity, Star, AlertTriangle, X, CheckCircle, Image as ImageIcon, Trash2, Ban, Hash, Gift, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getXpForNextLevel, MARKET_ITEMS } from '../lib/constants';

interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  joinedAt: string;
  level: number;
  xp: number;
  total_xp: number;
  tokens: number;
  game_uid?: string;
  discord_id?: string;
  discord_username?: string;
  discord_avatar?: string;
  discord_banner?: string;
  isDiscordVerified: boolean;
  avatar_preference: 'discord' | 'google';
  lottery: {
    current_tickets: number;
    wins: {
      first: number;
      second: number;
      third: number;
    };
    history: any[];
  };
  activity_log: any[];
  purchase_history: any[];
  isBanned?: boolean;
  banReason?: string;
  bannedAt?: string;
  bannedBy?: string;
}

export default function AdminSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [isBanning, setIsBanning] = useState(false);
  
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantType, setGrantType] = useState<'tokens' | string>('tokens');
  const [grantAmount, setGrantAmount] = useState(1);
  const [isGranting, setIsGranting] = useState(false);
  const [showGrantDropdown, setShowGrantDropdown] = useState(false);

  useEffect(() => {
    if (userId && (!selectedUser || selectedUser.id !== userId)) {
      const fetchUser = async () => {
        setIsLoadingUser(true);
        try {
          const idToken = await auth.currentUser?.getIdToken();
          const response = await fetch(`/api/admin/user/${userId}`, {
            headers: { 'Authorization': `Bearer ${idToken}` }
          });
          if (response.ok) {
            const data = await response.json();
            setSelectedUser(data);
          }
        } catch (error) {
          console.error('Error fetching user:', error);
        } finally {
          setIsLoadingUser(false);
        }
      };
      fetchUser();
    } else if (!userId) {
      setSelectedUser(null);
    }
  }, [userId]);

  if (user?.email !== 'xdjameherobrine@gmail.com') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/admin/search?query=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setSearchResults(data);
      setSelectedUser(null);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim()) return;

    setIsBanning(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/ban', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUid: selectedUser.id,
          reason: banReason,
          staffName: auth.currentUser?.displayName || 'Administrator'
        })
      });

      if (!response.ok) throw new Error('Ban failed');
      
      // Update local state
      setSelectedUser({
        ...selectedUser,
        isBanned: true,
        banReason: banReason,
        bannedAt: new Date().toISOString(),
        bannedBy: auth.currentUser?.displayName || 'Administrator'
      });
      setShowBanModal(false);
      setBanReason('');
    } catch (error) {
      console.error('Ban error:', error);
      alert('Failed to ban user');
    } finally {
      setIsBanning(false);
    }
  };

  const handleGrantRewards = async () => {
    if (!selectedUser || grantAmount <= 0) return;

    setIsGranting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/grant-rewards', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUid: selectedUser.id,
          rewardType: grantType,
          amount: grantAmount
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Grant failed');
      }
      
      // Refresh user data to show updated tokens/history
      const updatedResponse = await fetch(`/api/admin/user/${selectedUser.id}`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (updatedResponse.ok) {
        const data = await updatedResponse.json();
        setSelectedUser(data);
      }

      setShowGrantModal(false);
      setGrantAmount(1);
      setGrantType('tokens');
      alert('Rewards granted successfully!');
    } catch (error: any) {
      console.error('Grant error:', error);
      alert(error.message || 'Failed to grant rewards');
    } finally {
      setIsGranting(false);
    }
  };

  const formatTimestamp = (timestamp: string | number) => {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} · ${hours}:${minutes}`;
  };

  if (selectedUser) {
    const nextXp = getXpForNextLevel(selectedUser.level);
    const progress = Math.min((selectedUser.xp / nextXp) * 100, 100);
    const totalWins = (selectedUser.lottery?.wins?.first || 0) + (selectedUser.lottery?.wins?.second || 0) + (selectedUser.lottery?.wins?.third || 0);

    const displayAvatar = selectedUser.avatar_preference === 'discord' && selectedUser.discord_avatar 
      ? selectedUser.discord_avatar 
      : selectedUser.photoURL || 'https://picsum.photos/seed/avatar/150/150';

    const displayBanner = selectedUser.discord_banner || 'https://picsum.photos/seed/banner/1000/300';

    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Button 
            variant="secondary" 
            onClick={() => navigate('/admin/search')}
            className="flex items-center gap-2 w-full sm:w-auto justify-center h-11 px-6"
          >
            <X className="h-4 w-4" />
            Back to Search
          </Button>
          <div className="grid grid-cols-2 sm:flex items-center gap-3 w-full sm:w-auto">
            {selectedUser.isBanned ? (
              <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-4 h-11 text-sm font-bold text-red-500 border border-red-500/20 w-full sm:w-auto justify-center">
                <Ban className="h-4 w-4" />
                BANNED
              </div>
            ) : (
              <Button 
                onClick={() => setShowBanModal(true)}
                className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 w-full sm:w-auto justify-center h-11 px-6"
              >
                <Ban className="h-4 w-4" />
                Ban User
              </Button>
            )}
            
            <div className="relative group w-full sm:w-auto">
              {!selectedUser.discord_id && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Discord Account Not Linked
                </div>
              )}
              <Button
                onClick={() => setShowGrantModal(true)}
                disabled={!selectedUser.discord_id}
                className={`flex items-center gap-2 w-full sm:w-auto justify-center h-11 px-6 ${
                  selectedUser.discord_id 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Gift className="h-4 w-4" />
                Grant
              </Button>
            </div>
          </div>
        </div>

        {/* Profile Header Card (Clone of Profile.tsx) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/50 dark:bg-[#111111]"
        >
          <div 
            className="h-48 bg-cover bg-center sm:h-64" 
            style={{ backgroundImage: `url(${displayBanner})` }}
          />
          <div className="relative px-6 pb-8 sm:px-8">
            <div className="-mt-20 flex flex-col items-center sm:-mt-28 sm:flex-row sm:items-end sm:space-x-6">
              <img
                src={displayAvatar}
                alt="Avatar"
                className="h-40 w-40 rounded-full border-4 border-white bg-white object-cover shadow-lg dark:border-[#111111] dark:bg-[#111111] sm:h-56 sm:w-56"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col items-center sm:items-start sm:mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                  {selectedUser.displayName}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {selectedUser.discord_id ? (
                    <div className="flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <Shield className="mr-1.5 h-3.5 w-3.5" />
                      Discord Verified
                    </div>
                  ) : (
                    <div className="flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-500/10 dark:text-slate-400">
                      <Shield className="mr-1.5 h-3.5 w-3.5" />
                      Not Verified
                    </div>
                  )}
                  {selectedUser.isBanned && (
                    <div className="flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 dark:bg-red-500/10 dark:text-red-400">
                      <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                      Banned
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Account Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5 text-[#E91E63]" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Username
                </label>
                <div className="flex w-full items-center justify-between rounded-xl border border-transparent bg-slate-50 px-4 py-2.5 dark:bg-slate-800/50">
                  <span className="font-medium text-slate-900 dark:text-white">{selectedUser.displayName}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Email Address
                </label>
                <div className="flex items-center rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800/50">
                  <Mail className="mr-3 h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-300">{selectedUser.email}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Discord ID
                </label>
                <div className="flex items-center rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800/50">
                  <span className="text-sm text-slate-600 dark:text-slate-300 font-mono">{selectedUser.discord_id || 'Not Linked'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  In-Game UID
                </label>
                <div className="flex items-center rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800/50">
                  <Hash className="mr-3 h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-300 font-mono">{selectedUser.game_uid || 'Not Set'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Membership */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-blue-500" />
                Membership
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <div className="mb-4 rounded-full bg-blue-500/10 p-4">
                <Calendar className="h-10 w-10 text-blue-500" />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Agent since</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {new Date(selectedUser.joinedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Level', value: selectedUser.level, icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
            { label: 'CI Tokens', value: selectedUser.tokens, icon: Coins, color: 'text-[#E91E63]', bg: 'bg-[#E91E63]/10' },
            { label: 'Total XP', value: selectedUser.total_xp, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Lottery Tickets', value: selectedUser.lottery?.current_tickets || 0, icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center p-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Level Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Level Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm font-medium mb-2">
                <span className="text-slate-600 dark:text-slate-400">Level {selectedUser.level}</span>
                <span className="text-slate-900 dark:text-white">{selectedUser.xp} / {nextXp} XP</span>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
                Lottery Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Current Entries</span>
                <span className="font-bold">{selectedUser.lottery?.current_tickets || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Lifetime Tickets</span>
                <span className="font-bold">{(selectedUser as any).lottery?.lifetime_tickets || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Total Wins</span>
                <span className="font-bold text-emerald-500">{totalWins}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Win Chance</span>
                  <span className="text-sm font-bold text-[#E91E63]">
                    {selectedUser.lottery?.current_tickets ? 'Calculating...' : '0%'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity & Purchases */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              {selectedUser.activity_log && selectedUser.activity_log.length > 5 && (
                <button 
                  onClick={() => navigate(`/admin/activity/${selectedUser.id}`)}
                  className="text-sm font-medium text-violet-600 dark:text-violet-400 underline hover:opacity-80 transition-opacity"
                >
                  View All
                </button>
              )}
            </CardHeader>
            <CardContent>
              {selectedUser.activity_log && selectedUser.activity_log.length > 0 ? (
                <div className="space-y-3">
                  {selectedUser.activity_log.slice(-5).reverse().map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                          {activity.reason.startsWith('Granted by') ? 'Granted by Admin' : activity.reason}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{formatTimestamp(activity.timestamp)}</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-500">+{activity.amount} CI</span>
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
              {selectedUser.purchase_history && selectedUser.purchase_history.length > 5 && (
                <button 
                  onClick={() => navigate(`/admin/purchases/${selectedUser.id}`)}
                  className="text-sm font-medium text-violet-600 dark:text-violet-400 underline hover:opacity-80 transition-opacity"
                >
                  View All
                </button>
              )}
            </CardHeader>
            <CardContent>
              {selectedUser.purchase_history && selectedUser.purchase_history.length > 0 ? (
                <div className="space-y-3">
                  {selectedUser.purchase_history.slice(-5).reverse().map((item) => (
                    <div key={item.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">{item.itemName.replace('_', ' ')}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{new Date(item.timestamp).toLocaleDateString()} · {item.amount}x</span>
                      </div>
                      <span className="text-sm font-bold text-[#E91E63]">-{item.tokensUsed} CI</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No purchases yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ban Modal */}
        <AnimatePresence>
          {showBanModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isBanning && setShowBanModal(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-zinc-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl"
              >
                <div className="flex items-center gap-3 text-red-500 mb-6">
                  <div className="p-3 bg-red-500/10 rounded-xl">
                    <Ban className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold">Ban User?</h2>
                </div>

                <div className="space-y-4 mb-8">
                  <p className="text-gray-300">
                    You are about to ban <span className="text-white font-bold">{selectedUser.displayName}</span>.
                  </p>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Reason for Ban:</label>
                    <textarea
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Enter reason for ban..."
                      className="w-full bg-black/50 border border-red-500/30 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500 transition-colors min-h-[100px]"
                      disabled={isBanning}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleBanUser}
                    disabled={!banReason.trim() || isBanning}
                    className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    {isBanning ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Banning...
                      </>
                    ) : (
                      'Confirm Ban'
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowBanModal(false)}
                    disabled={isBanning}
                    variant="secondary"
                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Grant Rewards Modal */}
        <AnimatePresence>
          {showGrantModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#111111] custom-scrollbar"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Gift className="h-5 w-5 text-indigo-500" />
                    Grant
                  </h3>
                  <button 
                    onClick={() => setShowGrantModal(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                      Select Reward Type
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setShowGrantDropdown(!showGrantDropdown)}
                        className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-[#0a0a0a] dark:text-white"
                      >
                        <span className="flex items-center gap-2">
                          {grantType === 'tokens' ? (
                            <>
                              <Coins className="h-4 w-4 text-[#E91E63]" />
                              CI Tokens
                            </>
                          ) : (
                            <>
                              <ImageIcon className="h-4 w-4 text-indigo-500" />
                              {MARKET_ITEMS.find(i => i.id === grantType)?.name || 'Select Item'}
                            </>
                          )}
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showGrantDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {showGrantDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute z-[60] mt-2 w-full max-h-[250px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#111111]"
                          >
                            <div className="p-1">
                              <button
                                onClick={() => { setGrantType('tokens'); setShowGrantDropdown(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                                  grantType === 'tokens' ? 'bg-indigo-500/10 text-indigo-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <Coins className="h-4 w-4 text-[#E91E63]" />
                                CI Tokens
                              </button>
                              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                              {MARKET_ITEMS.map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => { setGrantType(item.id); setShowGrantDropdown(false); }}
                                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                                    grantType === item.id ? 'bg-indigo-500/10 text-indigo-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <img src={item.image} alt="" className="h-6 w-6 rounded object-cover" />
                                  <span className="truncate">{item.name}</span>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                      Quantity / Amount
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={grantAmount}
                      onChange={(e) => setGrantAmount(parseInt(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-[#0a0a0a] dark:text-white"
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => setShowGrantModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleGrantRewards}
                      disabled={isGranting || grantAmount <= 0}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {isGranting ? 'Granting...' : 'Grant Reward'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Administrator Search
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Search and manage users across the Apex Grid.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Email, Discord ID, or Display Name..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-slate-900 focus:border-[#E91E63] focus:outline-none focus:ring-1 focus:ring-[#E91E63] dark:border-slate-800 dark:bg-[#0a0a0a] dark:text-white"
              />
            </div>
            <Button 
              type="submit" 
              disabled={isSearching || !searchQuery.trim()}
              className="px-8 w-full sm:w-auto"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {searchResults.map((user) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate(`/admin/search/${user.id}`)}
            className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-[#E91E63] hover:shadow-md dark:border-slate-800 dark:bg-[#111111] dark:hover:border-[#E91E63]"
          >
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <img
                src={user.photoURL || 'https://picsum.photos/seed/avatar/150/150'}
                alt={user.displayName}
                className="h-16 w-16 sm:h-12 sm:w-12 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-[#E91E63] transition-colors">
                    {user.displayName}
                  </h3>
                  {user.isBanned && (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500">
                      BANNED
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {user.email || 'No Email'}
                  </span>
                  {user.discord_username && (
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      @{user.discord_username}
                    </span>
                  )}
                  {user.discord_id && (
                    <span className="flex items-center gap-1 opacity-60">
                      ID: {user.discord_id}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-center sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 w-full sm:w-auto">
                <div className="text-sm font-bold text-slate-900 dark:text-white">Level {user.level}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{user.tokens} CI Tokens</div>
              </div>
            </div>
          </motion.div>
        ))}

        {!isSearching && searchQuery && searchResults.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-slate-500 dark:text-slate-400">No users found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
