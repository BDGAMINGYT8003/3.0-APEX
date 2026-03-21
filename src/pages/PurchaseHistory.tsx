import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function PurchaseHistory() {
  const { profile: myProfile } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();
  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [loading, setLoading] = useState(!!userId);

  useEffect(() => {
    if (userId) {
      const fetchUser = async () => {
        try {
          const idToken = await auth.currentUser?.getIdToken();
          const response = await fetch(`/api/admin/user/${userId}`, {
            headers: { 'Authorization': `Bearer ${idToken}` }
          });
          if (response.ok) {
            const data = await response.json();
            setTargetProfile(data);
          }
        } catch (error) {
          console.error('Error fetching user:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchUser();
    }
  }, [userId]);

  const profile = userId ? targetProfile : myProfile;

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E91E63] border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Purchase History
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Full history of {userId ? `${profile.displayName}'s` : 'your'} CI Token spending.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate(userId ? `/admin/search/${userId}` : '/dashboard')} className="w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Return to {userId ? 'User Profile' : 'Dashboard'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {profile.purchase_history && profile.purchase_history.length > 0 ? (
            <div className="space-y-4">
              {[...profile.purchase_history].reverse().map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 dark:border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-base font-medium text-slate-900 dark:text-white capitalize">
                      {item.itemName.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(item.timestamp).toLocaleDateString()} · {item.amount}x
                    </span>
                  </div>
                  <span className="text-lg font-bold text-[#E91E63]">
                    -{item.tokensUsed} CI
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-12 text-slate-500 dark:text-slate-400">No purchases yet. Visit the Market to browse items.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
