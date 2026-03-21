import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, handleFirestoreError, OperationType } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { motion } from 'motion/react';
import { Shield, KeyRound, AlertCircle } from 'lucide-react';
import { doc, updateDoc, getDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function Verify() {
  const { user, profile, loading, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Idle timeout logic (5 minutes)
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        signOut();
      }, 5 * 60 * 1000);
    };

    // Set initial timeout
    resetTimeout();

    // Reset timeout on user activity
    window.addEventListener('mousemove', resetTimeout);
    window.addEventListener('keydown', resetTimeout);
    window.addEventListener('click', resetTimeout);
    window.addEventListener('scroll', resetTimeout);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimeout);
      window.removeEventListener('keydown', resetTimeout);
      window.removeEventListener('click', resetTimeout);
      window.removeEventListener('scroll', resetTimeout);
    };
  }, [signOut]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E91E63] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (profile?.isDiscordVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      setError('Please enter a verification code.');
      return;
    }

    setIsVerifying(true);

    try {
      // 1. Check if the code exists in verification_codes collection
      const codeRef = doc(db, 'verification_codes', trimmedCode);
      const codeDoc = await getDoc(codeRef);

      if (!codeDoc.exists()) {
        throw new Error('Invalid verification code. Please try again.');
      }

      const codeData = codeDoc.data();
      
      // 2. Check if the code has expired
      if (Date.now() > codeData.expiresAt) {
        await deleteDoc(codeRef);
        throw new Error('Verification code has expired. Please generate a new one using /dashboard.');
      }

      // 3. Link the Discord account to the user's profile
      if (user) {
        const discordId = codeData.discord_id;

        // Check if this Discord account is already linked to another ACTIVE Google account
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('discord_id', '==', discordId));
        const querySnap = await getDocs(q);

        if (!querySnap.empty) {
          // Found a user with this Discord ID. Check if it's the current user.
          const existingUserDoc = querySnap.docs[0];
          if (existingUserDoc.id !== user.uid) {
            throw new Error('This Discord account is already linked to another active Google account.');
          }
        }

        const userRef = doc(db, 'users', user.uid);
        try {
          await updateDoc(userRef, {
            isDiscordVerified: true,
            discord_id: codeData.discord_id,
            discord_username: codeData.username,
            discord_avatar: codeData.avatar,
            linkedAt: new Date().toISOString()
          });

          // 4. Delete the used verification code
          await deleteDoc(codeRef);
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 dark:bg-[#0a0a0a]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#111111]"
      >
        <div className="flex flex-col items-center border-b border-slate-100 p-8 dark:border-slate-800/50">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E91E63]/10 dark:bg-[#E91E63]/20">
            <Shield className="h-8 w-8 text-[#E91E63]" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Discord Verification</h2>
          <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
            Link your Discord account to continue
          </p>
        </div>

        <div className="p-8">
          <div className="mb-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
            <p className="mb-2 font-medium text-slate-900 dark:text-slate-100">Instructions:</p>
            <ol className="ml-4 list-decimal space-y-1">
              <li>Go to the Apex Girls Discord server.</li>
              <li>Run the <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-xs text-[#E91E63] dark:bg-slate-700">/dashboard</code> command.</li>
              <li>Copy your unique verification code.</li>
              <li>Paste it below to link your account.</li>
            </ol>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="code" className="sr-only">Verification Code</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-[#E91E63] focus:outline-none focus:ring-1 focus:ring-[#E91E63] dark:border-slate-700 dark:bg-[#1a1a1a] dark:text-white dark:placeholder:text-slate-500"
                  placeholder="Enter verification code"
                  disabled={isVerifying}
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center space-x-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isVerifying || !code.trim()}
            >
              {isVerifying ? 'Verifying...' : 'Verify Account'}
            </Button>
            
            <button
              type="button"
              onClick={signOut}
              className="mt-4 w-full text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Sign out and try later
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
