"use client";
import React, { useState } from "react";
import { Bill } from "./types";
import { v4 as uuidv4 } from "uuid";
import { Calendar, DollarSign, Clock, Percent, Plus, Loader2 } from "lucide-react";

interface BillFormProps {
  setBillsAction: React.Dispatch<React.SetStateAction<Bill[]>>;
  onAddBill?: (bill: Omit<Bill, 'id'>) => Promise<Bill | null>;
}

// Extend the Bill interface to include allowableLateDay
interface ExtendedBill extends Bill {
  allowableLateDay: number;
}

export default function BillForm({ setBillsAction, onAddBill }: BillFormProps) {
  const [newBill, setNewBill] = useState<ExtendedBill>({
    name: "",
    paymentAmount: 0,
    apr: 0,
    remainingBalance: 0,
    dueDate: "",
    billType: "recurring",
    allowableLateDay: 0
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericFields = ["paymentAmount", "apr", "remainingBalance", "allowableLateDay"];
    setNewBill(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? parseFloat(value) : value
    }));
  };

  const handleAddBill = async () => {
    if (!newBill.name || !newBill.dueDate || newBill.paymentAmount <= 0) return;

    setIsSaving(true);

    try {
      // If onAddBill is provided, save to database
      if (onAddBill) {
        const savedBill = await onAddBill({
          name: newBill.name,
          paymentAmount: newBill.paymentAmount,
          apr: newBill.apr,
          remainingBalance: newBill.remainingBalance,
          dueDate: newBill.dueDate,
          billType: newBill.billType,
          allowableLateDay: newBill.allowableLateDay
        });

        if (savedBill) {
          // Add the saved bill (with server-generated id) to local state
          setBillsAction((prev) => [...prev, savedBill]);
        }
      } else {
        // Fallback: just add to local state
        setBillsAction((prev) => {
          const isDuplicate = prev.some(
            (bill) => bill.name === newBill.name && bill.dueDate === newBill.dueDate
          );
          return isDuplicate
            ? prev
            : [
                ...prev,
                {
                  ...newBill,
                  id: uuidv4(),
                },
              ];
        });
      }

      setNewBill({
        name: "",
        paymentAmount: 0,
        apr: 0,
        remainingBalance: 0,
        dueDate: "",
        billType: "recurring",
        allowableLateDay: 0
      });
    } catch (error) {
      console.error('Failed to add bill:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-card overflow-hidden">
      {/* Header */}
      <div className="bg-neutral-900 px-5 py-4 border-b-2 border-primary-500">
        <h2 className="text-base font-bold text-white uppercase tracking-wide">Add New Bill</h2>
      </div>

      {/* Form Content */}
      <div className="p-5 space-y-5">
        {/* Bill Name */}
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Bill Name
          </label>
          <input
            type="text"
            name="name"
            value={newBill.name}
            onChange={handleChange}
            className="block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="Enter bill name"
          />
        </div>

        {/* Payment Amount */}
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Payment Amount
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-4 w-4 text-neutral-400" />
            </div>
            <input
              type="number"
              name="paymentAmount"
              value={newBill.paymentAmount}
              onChange={handleChange}
              className="pl-10 block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder="0.00"
            />
          </div>
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
              value={newBill.apr}
              onChange={handleChange}
              className="pl-10 block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Due Date
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-neutral-400" />
            </div>
            <input
              type="date"
              name="dueDate"
              value={newBill.dueDate}
              onChange={handleChange}
              className="pl-10 block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>
        </div>

        {/* Allowable Late Days */}
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Allowable Late Days
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Clock className="h-4 w-4 text-neutral-400" />
            </div>
            <input
              type="number"
              name="allowableLateDay"
              value={newBill.allowableLateDay}
              onChange={handleChange}
              min="0"
              max="30"
              className="pl-10 block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder="0"
            />
          </div>
          <p className="mt-1.5 text-xs text-neutral-400">Maximum days payment can be late</p>
        </div>

        {/* Bill Type */}
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Bill Type
          </label>
          <select
            name="billType"
            value={newBill.billType}
            onChange={handleChange}
            className="block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          >
            <option value="recurring">Recurring (Monthly)</option>
            <option value="one-time">One-Time</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleAddBill}
          disabled={isSaving || !newBill.name || !newBill.dueDate || newBill.paymentAmount <= 0}
          className="w-full bg-primary-500 text-neutral-900 py-2.5 px-4 rounded font-semibold hover:bg-primary-400 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add Bill
            </>
          )}
        </button>
      </div>
    </div>
  );
}
