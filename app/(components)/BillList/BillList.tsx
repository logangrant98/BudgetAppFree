"use client";
import React, { useState } from "react";
import { Bill } from "../../(components)/types";
import BillsTable from "./BillsTable";
import { Clock } from "lucide-react";
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
      {editingBill && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Bill: {editingBill.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill Name</label>
                <input
                  type="text"
                  name="name"
                  value={editingBill.name}
                  onChange={handleEditChange}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
                <input
                  type="number"
                  name="paymentAmount"
                  value={editingBill.paymentAmount}
                  onChange={handleEditChange}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">APR (%)</label>
                <input
                  type="number"
                  name="apr"
                  value={editingBill.apr}
                  onChange={handleEditChange}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  name="dueDate"
                  value={editingBill.dueDate}
                  onChange={handleEditChange}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>Allowable Late Days</span>
                  </div>
                </label>
                <input
                  type="number"
                  name="allowableLateDay"
                  value={editingBill.allowableLateDay || 0}
                  onChange={handleEditChange}
                  min="0"
                  max="30"
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill Type</label>
                <select
                  name="billType"
                  value={editingBill.billType}
                  onChange={handleEditChange}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                >
                  <option value="recurring">Recurring (Monthly)</option>
                  <option value="one-time">One-Time</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}