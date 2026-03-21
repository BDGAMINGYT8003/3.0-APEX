import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function RecentActivity() {
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Recent Activity
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Full history of {userId ? `${profile.displayName}'s` : 'your'} CI Token gains.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate(userId ? `/admin/search/${userId}` : '/dashboard')} className="w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Return to {userId ? 'User Profile' : 'Dashboard'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {profile.activity_log && profile.activity_log.length > 0 ? (
            <div className="space-y-4">
              {[...profile.activity_log].reverse().map((activity) => (
                <div key={activity.id} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 dark:border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-base font-medium text-slate-900 dark:text-white capitalize">
                      {activity.reason}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-emerald-500">
                    +{activity.amount} CI
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-12 text-slate-500 dark:text-slate-400">No recent activity recorded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
