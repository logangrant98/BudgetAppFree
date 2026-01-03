"use client";
import React, { useState } from "react";
import { CreditCard } from "./types";
import {
  CreditCard as CreditCardIcon,
  DollarSign,
  Percent,
  Trash2,
  Edit3,
  Check,
  X,
  Loader2,
  Calendar,
  TrendingDown
} from "lucide-react";

interface CreditCardListProps {
  creditCards: CreditCard[];
  onUpdateCreditCard: (cardId: string, updates: Partial<CreditCard>) => Promise<void>;
  onDeleteCreditCard: (cardId: string) => Promise<void>;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

export default function CreditCardList({
  creditCards,
  onUpdateCreditCard,
  onDeleteCreditCard
}: CreditCardListProps) {
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CreditCard>>({});
  const [savingCards, setSavingCards] = useState<Set<string>>(new Set());
  const [deletingCards, setDeletingCards] = useState<Set<string>>(new Set());

  const handleStartEdit = (card: CreditCard) => {
    setEditingCardId(card.id);
    setEditForm({
      name: card.name,
      balance: card.balance,
      minimumPayment: card.minimumPayment,
      recommendedPayment: card.recommendedPayment,
      apr: card.apr,
      dueDate: card.dueDate
    });
  };

  const handleCancelEdit = () => {
    setEditingCardId(null);
    setEditForm({});
  };

  const handleSaveEdit = async (cardId: string) => {
    setSavingCards(prev => new Set(prev).add(cardId));
    try {
      await onUpdateCreditCard(cardId, editForm);
      setEditingCardId(null);
      setEditForm({});
    } finally {
      setSavingCards(prev => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }
  };

  const handleDelete = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this credit card?')) return;

    setDeletingCards(prev => new Set(prev).add(cardId));
    try {
      await onDeleteCreditCard(cardId);
    } finally {
      setDeletingCards(prev => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }
  };

  if (!creditCards || creditCards.length === 0) {
    return null;
  }

  // Calculate total debt
  const totalDebt = creditCards.reduce((sum, card) => sum + card.balance, 0);
  const totalMinPayment = creditCards.reduce((sum, card) => sum + card.minimumPayment, 0);
  const totalRecommendedPayment = creditCards.reduce((sum, card) => sum + card.recommendedPayment, 0);

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-card overflow-hidden">
      {/* Header */}
      <div className="bg-neutral-900 px-5 py-4 border-b-2 border-primary-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary-500 p-1.5 rounded">
              <CreditCardIcon className="w-5 h-5 text-neutral-900" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wide">Credit Cards</h2>
              <p className="text-neutral-400 text-xs mt-0.5">{creditCards.length} {creditCards.length === 1 ? 'card' : 'cards'} • {formatCurrency(totalDebt)} total debt</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 border-b border-neutral-200 bg-neutral-50">
        <div className="p-3 border-r border-neutral-200">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Total Debt</p>
          <p className="text-lg font-bold text-neutral-900">{formatCurrency(totalDebt)}</p>
        </div>
        <div className="p-3 border-r border-neutral-200">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Min. Payments</p>
          <p className="text-lg font-bold text-neutral-900">{formatCurrency(totalMinPayment)}</p>
        </div>
        <div className="p-3">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Recommended</p>
          <p className="text-lg font-bold text-green-700">{formatCurrency(totalRecommendedPayment)}</p>
        </div>
      </div>

      {/* Cards List */}
      <div className="divide-y divide-neutral-100">
        {creditCards.map(card => {
          const isEditing = editingCardId === card.id;
          const isSaving = savingCards.has(card.id);
          const isDeleting = deletingCards.has(card.id);

          return (
            <div key={card.id} className="p-4 hover:bg-neutral-50 transition-colors">
              {isEditing ? (
                /* Edit Mode */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-neutral-900">Edit Credit Card</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveEdit(card.id)}
                        disabled={isSaving}
                        className="px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded hover:bg-green-600 disabled:opacity-50 flex items-center gap-1"
                      >
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 bg-neutral-200 text-neutral-700 text-xs font-semibold rounded hover:bg-neutral-300 flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">Card Name</label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-neutral-300 rounded text-sm bg-white text-neutral-900 focus:ring-1 focus:ring-neutral-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">Balance</label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
                        <input
                          type="number"
                          value={editForm.balance || 0}
                          onChange={(e) => setEditForm(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
                          className="w-full pl-6 pr-2 py-1.5 border border-neutral-300 rounded text-sm bg-white text-neutral-900 focus:ring-1 focus:ring-neutral-500"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">Min. Payment</label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
                        <input
                          type="number"
                          value={editForm.minimumPayment || 0}
                          onChange={(e) => setEditForm(prev => ({ ...prev, minimumPayment: parseFloat(e.target.value) || 0 }))}
                          className="w-full pl-6 pr-2 py-1.5 border border-neutral-300 rounded text-sm bg-white text-neutral-900 focus:ring-1 focus:ring-neutral-500"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">Recommended Payment</label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
                        <input
                          type="number"
                          value={editForm.recommendedPayment || 0}
                          onChange={(e) => setEditForm(prev => ({ ...prev, recommendedPayment: parseFloat(e.target.value) || 0 }))}
                          className="w-full pl-6 pr-2 py-1.5 border border-neutral-300 rounded text-sm bg-white text-neutral-900 focus:ring-1 focus:ring-neutral-500"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">APR (%)</label>
                      <div className="relative">
                        <Percent className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
                        <input
                          type="number"
                          value={editForm.apr || 0}
                          onChange={(e) => setEditForm(prev => ({ ...prev, apr: parseFloat(e.target.value) || 0 }))}
                          className="w-full pl-6 pr-2 py-1.5 border border-neutral-300 rounded text-sm bg-white text-neutral-900 focus:ring-1 focus:ring-neutral-500"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">Due Date (Day)</label>
                      <select
                        value={editForm.dueDate || '1'}
                        onChange={(e) => setEditForm(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-neutral-300 rounded text-sm bg-white text-neutral-900 focus:ring-1 focus:ring-neutral-500"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day.toString()}>{day}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                      <CreditCardIcon className="w-5 h-5 text-neutral-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-neutral-900">{card.name}</span>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-neutral-900 text-white">
                          {card.apr.toFixed(1)}% APR
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-neutral-500">
                          Balance: <span className="font-semibold text-neutral-700">{formatCurrency(card.balance)}</span>
                        </span>
                        <span className="text-xs text-neutral-500">
                          Payment: <span className="font-semibold text-green-700">{formatCurrency(card.recommendedPayment)}</span>
                        </span>
                        <span className="text-xs text-neutral-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {card.dueDate}{['1', '21', '31'].includes(card.dueDate) ? 'st' : ['2', '22'].includes(card.dueDate) ? 'nd' : ['3', '23'].includes(card.dueDate) ? 'rd' : 'th'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartEdit(card)}
                      className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
                      title="Edit card"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(card.id)}
                      disabled={isDeleting}
                      className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      title="Delete card"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Debt Payoff Tip */}
      <div className="p-4 bg-green-50 border-t border-green-200">
        <div className="flex items-start gap-3">
          <div className="bg-green-500 p-1.5 rounded flex-shrink-0">
            <TrendingDown className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-green-900 text-sm">Snowball Strategy</h4>
            <p className="text-xs text-green-700 mt-0.5">
              Use the "Extra" button on each paycheck to add leftover money toward paying down your cards faster.
              Focus on one card at a time for maximum impact!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
