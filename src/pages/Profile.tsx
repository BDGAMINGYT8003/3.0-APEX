import React, { useState, useEffect } from 'react';
import { useAuth, handleFirestoreError, OperationType } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Calendar, Save, CheckCircle, AlertTriangle, Edit2, X, Check, User, Mail, Image as ImageIcon, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function Profile() {
  const { user, profile } = useAuth();
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [username, setUsername] = useState('');
  const [uid, setUid] = useState('');
  const [isSavingUid, setIsSavingUid] = useState(false);
  const [uidSaved, setUidSaved] = useState(false);
  const [showUidConfirm, setShowUidConfirm] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.displayName || profile.discord_username || '');
      setUid(profile.game_uid || profile.discord_id || '');
    }
  }, [profile]);

  if (!profile || !user) return null;

  const totalWins = profile.lottery.wins.first + profile.lottery.wins.second + profile.lottery.wins.third;

  const handleSaveUsername = async () => {
    if (!username.trim() || username === profile.displayName) {
      setIsEditingUsername(false);
      return;
    }
    setIsSavingUsername(true);
    try {
      const userRef = doc(db, 'users', profile.id);
      await updateDoc(userRef, { displayName: username.trim() });
      setIsEditingUsername(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.id}`);
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handleSaveUid = async () => {
    if (!uid.trim() || uid === profile.game_uid) return;
    setIsSavingUid(true);
    try {
      const userRef = doc(db, 'users', profile.id);
      await updateDoc(userRef, { game_uid: uid.trim() });
      setUidSaved(true);
      setShowUidConfirm(false);
      setTimeout(() => setUidSaved(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.id}`);
    } finally {
      setIsSavingUid(false);
    }
  };

  const setAvatarPreference = async (pref: 'discord' | 'google') => {
    try {
      const userRef = doc(db, 'users', profile.id);
      await updateDoc(userRef, { avatar_preference: pref });
      setIsAvatarModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.id}`);
    }
  };

  const displayAvatar = profile.avatar_preference === 'discord' && profile.discord_avatar 
    ? profile.discord_avatar 
    : profile.photoURL || 'https://picsum.photos/seed/avatar/150/150';

  const displayBanner = profile.discord_banner || 'https://picsum.photos/seed/banner/1000/300';

  return (
    <div className="space-y-8">
      {/* Profile Header Card */}
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
            <div 
              className="relative group cursor-pointer" 
              onClick={() => setIsAvatarModalOpen(true)}
            >
              <img
                src={displayAvatar}
                alt="Avatar"
                className="h-40 w-40 rounded-full border-4 border-white bg-white object-cover shadow-lg dark:border-[#111111] dark:bg-[#111111] sm:h-56 sm:w-56 transition-transform group-hover:scale-[1.02]"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex flex-col items-center text-white">
                  <ImageIcon className="mb-1 h-6 w-6" />
                  <span className="text-xs font-bold uppercase tracking-wider">Change Avatar</span>
                </div>
              </div>
            </div>
            {profile.isDiscordVerified && (
              <div className="mt-4 sm:mb-6">
                <div className="flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Shield className="mr-1.5 h-3.5 w-3.5" />
                  Discord Verified
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Username & Email Card */}
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
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  {isEditingUsername ? (
                    <div className="relative flex w-full items-center">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 focus:border-[#E91E63] focus:outline-none focus:ring-1 focus:ring-[#E91E63] dark:border-slate-800 dark:bg-[#0a0a0a] dark:text-white"
                        autoFocus
                        placeholder="Enter username"
                      />
                      <button 
                        onClick={() => { setIsEditingUsername(false); setUsername(profile.displayName); }}
                        className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex w-full items-center justify-between rounded-xl border border-transparent bg-slate-50 px-4 py-2.5 dark:bg-slate-800/50">
                      <span className="font-medium text-slate-900 dark:text-white">{profile.displayName}</span>
                      <button 
                        onClick={() => setIsEditingUsername(true)}
                        className="text-slate-400 hover:text-[#E91E63] transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {isEditingUsername && username !== profile.displayName && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="flex items-center space-x-3 pt-1"
                    >
                      <Button
                        onClick={handleSaveUsername}
                        disabled={isSavingUsername || !username.trim()}
                        className="flex-1 bg-[#E91E63] hover:bg-[#D81B60] text-white shadow-lg shadow-[#E91E63]/20"
                      >
                        {isSavingUsername ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        onClick={() => { setUsername(profile.displayName); setIsEditingUsername(false); }}
                        variant="secondary"
                        className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Email Address
              </label>
              <div className="flex items-center rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800/50">
                <Mail className="mr-3 h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-300">{user.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Joined Date Card */}
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
              {new Date(profile.joinedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Claim Rewards Card */}
      <Card>
        <CardHeader>
          <CardTitle>Claim Rewards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                This In-Game UID is used to receive all items bought from the market and monthly lottery winnings directly via your in-game mailbox. Please ensure this is accurate; once saved, it cannot be changed without contacting Apex Girls support.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:items-end">
              <div className="space-y-2">
                <label htmlFor="uid" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  In-Game UID
                </label>
                <input
                  id="uid"
                  type="text"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  placeholder="Enter your UID"
                  disabled={!!profile.game_uid}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed focus:border-[#E91E63] focus:outline-none focus:ring-1 focus:ring-[#E91E63] dark:border-slate-800 dark:bg-[#0a0a0a] dark:text-white"
                />
              </div>

              {!profile.game_uid && (
                <div className="flex flex-col space-y-3">
                  {!showUidConfirm ? (
                    <Button
                      onClick={() => setShowUidConfirm(true)}
                      disabled={!uid.trim()}
                      className="w-full py-2.5"
                    >
                      Save UID
                    </Button>
                  ) : (
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleSaveUid}
                        disabled={isSavingUid}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {isSavingUid ? 'Saving...' : 'Confirm UID'}
                      </Button>
                      <Button
                        onClick={() => setShowUidConfirm(false)}
                        disabled={isSavingUid}
                        variant="secondary"
                        className="px-3"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <AnimatePresence>
              {showUidConfirm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                    <AlertTriangle className="mr-3 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-500" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400">Final Confirmation Required</h4>
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-500">
                        You are permanently linking UID <span className="font-mono font-bold underline">{uid}</span> to your account. This is a one-time action.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {uidSaved && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center rounded-xl bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400 text-sm font-bold"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                UID Successfully Locked
              </motion.div>
            )}

            {totalWins > 0 && profile.game_uid && (
              <div className="rounded-xl bg-indigo-500/10 p-4 border border-indigo-500/20">
                <div className="flex items-center space-x-3 mb-2">
                  <Trophy className="h-5 w-5 text-indigo-500" />
                  <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Pending Rewards Detected</h4>
                </div>
                <p className="text-sm text-indigo-700 dark:text-indigo-400">
                  Our team is processing your winnings. They will be delivered to UID: <span className="font-mono font-bold text-indigo-900 dark:text-indigo-200">{profile.game_uid}</span>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Avatar Switcher Modal */}
      <AnimatePresence>
        {isAvatarModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAvatarModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-800 dark:bg-[#111111]"
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Choose Avatar</h3>
                <button 
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Google Avatar */}
                <button
                  onClick={() => setAvatarPreference('google')}
                  className={`group relative flex flex-col items-center rounded-2xl border-2 p-4 transition-all ${
                    profile.avatar_preference !== 'discord'
                      ? 'border-[#E91E63] bg-[#E91E63]/5'
                      : 'border-slate-100 bg-slate-50 hover:border-slate-200 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="mb-3 h-24 w-24 flex-shrink-0 overflow-hidden rounded-full shadow-md">
                    <img
                      src={profile.photoURL}
                      alt="Google"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Google</span>
                  {profile.avatar_preference !== 'discord' && (
                    <div className="absolute -right-2 -top-2 rounded-full bg-[#E91E63] p-1 text-white">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>

                {/* Discord Avatar */}
                <button
                  onClick={() => profile.discord_avatar && setAvatarPreference('discord')}
                  disabled={!profile.discord_avatar}
                  className={`group relative flex flex-col items-center rounded-2xl border-2 p-4 transition-all ${
                    profile.avatar_preference === 'discord'
                      ? 'border-indigo-500 bg-indigo-500/5'
                      : !profile.discord_avatar
                      ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50'
                      : 'border-slate-100 bg-slate-50 hover:border-slate-200 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="mb-3 h-24 w-24 flex-shrink-0 overflow-hidden rounded-full shadow-md">
                    <img
                      src={profile.discord_avatar || 'https://picsum.photos/seed/discord/100/100'}
                      alt="Discord"
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Discord</span>
                  {!profile.discord_avatar && (
                    <span className="mt-1 text-[10px] font-medium text-slate-400 uppercase">Not Linked</span>
                  )}
                  {profile.avatar_preference === 'discord' && (
                    <div className="absolute -right-2 -top-2 rounded-full bg-indigo-500 p-1 text-white">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              </div>

              <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
                Your selection will be updated across the entire platform instantly.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
