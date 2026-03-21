import React, { useState } from 'react';
import { useAuth, handleFirestoreError, OperationType } from '../contexts/AuthContext';
import { MARKET_ITEMS } from '../lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ShoppingCart, AlertCircle, UserX, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Market() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<typeof MARKET_ITEMS[0] | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState('');
  const [showUidModal, setShowUidModal] = useState(false);

  if (!profile) return null;

  const handlePurchaseClick = (item: typeof MARKET_ITEMS[0]) => {
    if (!profile.game_uid) {
      setShowUidModal(true);
      return;
    }
    setSelectedItem(item);
    setQuantity(1);
    setError('');
  };

  const handlePurchase = async () => {
    if (!selectedItem || !profile || !user) return;
    
    if (!profile.game_uid) {
      setShowUidModal(true);
      setSelectedItem(null);
      return;
    }

    setIsPurchasing(true);
    setError('');

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/market/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          itemId: selectedItem.id,
          quantity
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Purchase failed.');
      }

      setSelectedItem(null);
      setQuantity(1);
    } catch (err: any) {
      setError(err.message || 'An error occurred during purchase.');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Apex Market
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Spend your CI Tokens on exclusive items and lottery tickets.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {MARKET_ITEMS.map((item, i) => {
          const isLottery = item.id === 'lottery_ticket';
          const isLocked = profile.level < item.minLevel;
          const bought = profile.market_stock?.[item.id] || 0;
          const remaining = item.maxStock - bought;
          
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={`h-full flex flex-col ${isLocked ? 'opacity-60' : ''}`}>
                <div className="relative h-48 w-full overflow-hidden border-b border-slate-100 dark:border-slate-800/50">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                      <div className="flex items-center space-x-2 text-sm font-medium text-amber-400 bg-black/50 px-3 py-1.5 rounded-full">
                        <AlertCircle size={16} />
                        <span>Requires Level {item.minLevel}</span>
                      </div>
                    </div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{item.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between pt-2">
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Cost</span>
                      <span className="font-bold text-[#E91E63]">{item.cost} CI</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Stock</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {isLottery ? '∞' : `${remaining}/${item.maxStock}`}
                      </span>
                    </div>
                  </div>
                  <Button
                    className="mt-6 w-full"
                    disabled={isLocked || (!isLottery && remaining <= 0)}
                    onClick={() => handlePurchaseClick(item)}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {isLocked ? 'Locked' : (!isLottery && remaining <= 0) ? 'Out of Stock' : 'Purchase'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* UID Required Modal */}
      <Modal
        isOpen={showUidModal}
        onClose={() => setShowUidModal(false)}
        title="In-Game UID Required"
      >
        <div className="flex flex-col items-center text-center space-y-6 py-4">
          <div className="h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <UserX className="h-10 w-10 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">UID Not Set</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs">
              You must set your In-Game UID in your profile before you can purchase items or lottery tickets.
            </p>
          </div>
          <Button 
            variant="primary" 
            className="w-full"
            onClick={() => navigate('/profile')}
          >
            Go to Profile
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="Confirm Purchase"
      >
        {selectedItem && (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800/50 dark:bg-slate-800/20">
              <img 
                src={selectedItem.image} 
                alt={selectedItem.name} 
                className="h-40 w-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="p-4">
                <h4 className="font-semibold text-slate-900 dark:text-white">{selectedItem.name}</h4>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedItem.description}</p>
                <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">Cost per unit: <span className="text-[#E91E63]">{selectedItem.cost} CI</span></p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-white">Quantity</label>
              <div className="flex items-center space-x-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <div className="relative flex-1 max-w-[100px]">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      const isLottery = selectedItem.id === 'lottery_ticket';
                      const bought = profile.market_stock?.[selectedItem.id] || 0;
                      const remaining = isLottery ? 9999 : selectedItem.maxStock - bought;
                      
                      if (isNaN(val)) setQuantity(1);
                      else setQuantity(Math.min(remaining, Math.max(1, val)));
                    }}
                    className="w-full text-center font-bold text-lg bg-transparent border-b-2 border-slate-200 focus:border-[#E91E63] outline-none dark:text-white dark:border-slate-700"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const isLottery = selectedItem.id === 'lottery_ticket';
                    const bought = profile.market_stock?.[selectedItem.id] || 0;
                    const remaining = isLottery ? 9999 : selectedItem.maxStock - bought;
                    if (quantity < remaining) setQuantity(quantity + 1);
                  }}
                  disabled={(() => {
                    const isLottery = selectedItem.id === 'lottery_ticket';
                    const bought = profile.market_stock?.[selectedItem.id] || 0;
                    const remaining = isLottery ? 9999 : selectedItem.maxStock - bought;
                    return quantity >= remaining;
                  })()}
                >
                  +
                </Button>
              </div>
              {! (selectedItem.id === 'lottery_ticket') && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Remaining stock: {selectedItem.maxStock - (profile.market_stock?.[selectedItem.id] || 0)}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <span className="font-medium text-slate-900 dark:text-white">Total Cost</span>
              <span className="text-xl font-bold text-[#E91E63]">{selectedItem.cost * quantity} CI</span>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-500 dark:bg-red-500/10">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setSelectedItem(null)}
                disabled={isPurchasing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handlePurchase}
                disabled={isPurchasing || profile.tokens < selectedItem.cost * quantity}
              >
                {isPurchasing ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
