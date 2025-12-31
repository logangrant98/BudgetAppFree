"use client";
import React, { useState } from "react";
import { Bill } from "../../(components)/types";
import BillsTable from "./BillsTable";
import { Clock, X } from "lucide-react";
import '../../../styles/globals.css';

interface BillListProps {
  bills: Bill[];
  setBillsAction: React.Dispatch<React.SetStateAction<Bill[]>>;
  collapsible?: boolean;
}

export default function BillList({ bills, setBillsAction, collapsible }: BillListProps) {
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  const handleDeleteBillAction = (billName: string) => {
    setBillsAction((prev) => prev.filter((b) => b.name !== billName));
  };

  const handleEditBillAction = (bill: Bill) => {
    setEditingBill(bill);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditingBill((prev) =>
      prev ? {
        ...prev,
        [name]: ["paymentAmount", "apr", "remainingBalance", "allowableLateDay"].includes(name)
          ? parseFloat(value)
          : value
      } : null
    );
  };

  const handleSaveEdit = () => {
    if (!editingBill) return;
    setBillsAction((prev) =>
      prev.map((b) => (b.name === editingBill.name ? editingBill : b))
    );
    setEditingBill(null);
  };

  const handleCancelEdit = () => {
    setEditingBill(null);
  };

  return (
    <div>
      <BillsTable
        bills={bills}
        onEditAction={handleEditBillAction}
        onDeleteAction={handleDeleteBillAction}
        collapsible={collapsible}
      />

      {/* Edit Modal */}
      {editingBill && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-elevated max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-neutral-900 px-5 py-4 border-b-2 border-primary-500 flex items-center justify-between">
              <h3 className="text-base font-bold text-white uppercase tracking-wide">
                Edit Bill
              </h3>
              <button
                onClick={handleCancelEdit}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5">
              {/* Bill Name (Disabled) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                  Bill Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={editingBill.name}
                  onChange={handleEditChange}
                  className="block w-full rounded border border-neutral-200 bg-neutral-100 text-neutral-500 py-2.5 px-3 text-sm cursor-not-allowed"
                  disabled
                />
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                  Payment Amount
                </label>
                <input
                  type="number"
                  name="paymentAmount"
                  value={editingBill.paymentAmount}
                  onChange={handleEditChange}
                  className="block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>

              {/* APR */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                  APR (%)
                </label>
                <input
                  type="number"
                  name="apr"
                  value={editingBill.apr}
                  onChange={handleEditChange}
                  className="block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={editingBill.dueDate}
                  onChange={handleEditChange}
                  className="block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>

              {/* Allowable Late Days */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Allowable Late Days
                  </span>
                </label>
                <input
                  type="number"
                  name="allowableLateDay"
                  value={editingBill.allowableLateDay || 0}
                  onChange={handleEditChange}
                  min="0"
                  max="30"
                  className="block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>

              {/* Bill Type */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                  Bill Type
                </label>
                <select
                  name="billType"
                  value={editingBill.billType}
                  onChange={handleEditChange}
                  className="block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                >
                  <option value="recurring">Recurring (Monthly)</option>
                  <option value="one-time">One-Time</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-end gap-3">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 rounded border border-neutral-300 text-neutral-700 font-medium hover:bg-neutral-100 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded bg-primary-500 text-neutral-900 font-semibold hover:bg-primary-400 transition-colors text-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
