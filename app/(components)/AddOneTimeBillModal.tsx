"use client";
import React, { useState } from "react";
import { X, DollarSign, Calendar, FileText } from "lucide-react";

interface AddOneTimeBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (bill: { name: string; amount: number; dueDate?: string }) => void;
  paycheckDate: string;
}

export default function AddOneTimeBillModal({
  isOpen,
  onClose,
  onAdd,
  paycheckDate,
}: AddOneTimeBillModalProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        name: name.trim(),
        amount: parseFloat(amount),
        dueDate: dueDate || undefined,
      });
      // Reset form
      setName("");
      setAmount("");
      setDueDate("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const formattedDate = new Date(paycheckDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md shadow-elevated">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-neutral-200 bg-neutral-900 rounded-t-lg">
          <div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">
              Add One-Time Bill
            </h2>
            <p className="text-neutral-400 text-xs mt-1">
              For paycheck: {formattedDate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Bill Name */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">
              Bill Name
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Car Repair, Medical Bill"
                className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                required
              />
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">
              Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                required
              />
            </div>
          </div>

          {/* Due Date (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">
              Due Date <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-700 font-medium hover:bg-neutral-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !amount}
              className="flex-1 px-4 py-2.5 bg-primary-500 text-neutral-900 rounded-lg font-semibold hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isSubmitting ? "Adding..." : "Add Bill"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
