"use client";
import React, { useState } from "react";
import { CreditCard } from "./types";
import { CreditCard as CreditCardIcon, DollarSign, Percent, Calendar, Plus, Loader2 } from "lucide-react";

interface CreditCardFormProps {
  onAddCreditCard: (card: Omit<CreditCard, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<CreditCard | null>;
}

export default function CreditCardForm({ onAddCreditCard }: CreditCardFormProps) {
  const [newCard, setNewCard] = useState({
    name: "",
    balance: 0,
    minimumPayment: 0,
    recommendedPayment: 0,
    apr: 0,
    dueDate: "1"
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericFields = ["balance", "minimumPayment", "recommendedPayment", "apr"];
    setNewCard(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? parseFloat(value) || 0 : value
    }));
  };

  const handleAddCard = async () => {
    if (!newCard.name || newCard.balance < 0) return;

    setIsSaving(true);

    try {
      const savedCard = await onAddCreditCard({
        name: newCard.name,
        balance: newCard.balance,
        minimumPayment: newCard.minimumPayment,
        recommendedPayment: newCard.recommendedPayment || newCard.minimumPayment,
        apr: newCard.apr,
        dueDate: newCard.dueDate
      });

      if (savedCard) {
        setNewCard({
          name: "",
          balance: 0,
          minimumPayment: 0,
          recommendedPayment: 0,
          apr: 0,
          dueDate: "1"
        });
      }
    } catch (error) {
      console.error('Failed to add credit card:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Generate due date options (1-31)
  const dueDateOptions = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="space-y-5">
      {/* Card Name */}
      <div>
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Card Name
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <CreditCardIcon className="h-4 w-4 text-neutral-400" />
          </div>
          <input
            type="text"
            name="name"
            value={newCard.name}
            onChange={handleChange}
            className="pl-10 block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="e.g., Discover, Apple Card"
          />
        </div>
      </div>

      {/* Current Balance */}
      <div>
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Current Balance
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <DollarSign className="h-4 w-4 text-neutral-400" />
          </div>
          <input
            type="number"
            name="balance"
            value={newCard.balance}
            onChange={handleChange}
            className="pl-10 block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="0.00"
            step="0.01"
            min="0"
          />
        </div>
      </div>

      {/* Minimum Payment */}
      <div>
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Minimum Payment
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <DollarSign className="h-4 w-4 text-neutral-400" />
          </div>
          <input
            type="number"
            name="minimumPayment"
            value={newCard.minimumPayment}
            onChange={handleChange}
            className="pl-10 block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="0.00"
            step="0.01"
            min="0"
          />
        </div>
      </div>

      {/* Recommended Payment */}
      <div>
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Recommended Payment
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <DollarSign className="h-4 w-4 text-neutral-400" />
          </div>
          <input
            type="number"
            name="recommendedPayment"
            value={newCard.recommendedPayment}
            onChange={handleChange}
            className="pl-10 block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="0.00"
            step="0.01"
            min="0"
          />
        </div>
        <p className="mt-1.5 text-xs text-neutral-400">Amount you plan to pay each month</p>
      </div>

      {/* APR */}
      <div>
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          APR (%)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Percent className="h-4 w-4 text-neutral-400" />
          </div>
          <input
            type="number"
            name="apr"
            value={newCard.apr}
            onChange={handleChange}
            className="pl-10 block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="0.00"
            step="0.01"
            min="0"
          />
        </div>
      </div>

      {/* Due Date (day of month) */}
      <div>
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          <Calendar className="h-3 w-3 text-neutral-400 inline-block mr-1" />
          Payment Due Date (Day of Month)
        </label>
        <select
          name="dueDate"
          value={newCard.dueDate}
          onChange={handleChange}
          className="block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
        >
          {dueDateOptions.map(day => (
            <option key={day} value={day.toString()}>
              {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of each month
            </option>
          ))}
        </select>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleAddCard}
        disabled={isSaving || !newCard.name}
        className="w-full bg-neutral-900 text-white py-2.5 px-4 rounded font-semibold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Adding...
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            Add Credit Card
          </>
        )}
      </button>
    </div>
  );
}
