"use client";
import React, { useState } from "react";
import { Bill } from "../types";
import BillActions from "./BillActions";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import '../../../styles/globals.css';

interface BillsTableProps {
  bills: Bill[];
  onEditAction: (bill: Bill) => void;
  onDeleteAction: (billId: string) => void;
  collapsible?: boolean;
}

export default function BillsTable({ bills, onEditAction, onDeleteAction, collapsible }: BillsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (!bills.length) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200 shadow-card overflow-hidden">
        <div className="bg-neutral-900 px-5 py-4 border-b-2 border-primary-500">
          <h2 className="text-base font-bold text-white uppercase tracking-wide">Your Bills</h2>
        </div>
        <div className="text-center py-12 px-6">
          <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-6 h-6 text-neutral-400" />
          </div>
          <p className="text-neutral-500 font-medium">No bills added yet</p>
          <p className="text-neutral-400 text-sm mt-1">Add your first bill using the form</p>
        </div>
      </div>
    );
  }

  const toggleExpand = (name: string) => {
    setExpanded(prev => {
      const newSet = new Set(prev);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
        newSet.add(name);
      }
      return newSet;
    });
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-card overflow-hidden">
      {/* Header */}
      <div className="bg-neutral-900 px-5 py-4 border-b-2 border-primary-500">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white uppercase tracking-wide">Your Bills</h2>
          <span className="bg-primary-500 text-neutral-900 px-2.5 py-0.5 rounded text-xs font-bold">
            {bills.length} {bills.length === 1 ? 'Bill' : 'Bills'}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Name</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">Amount</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Due Date</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Type</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wide">Late Days</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {bills.map((bill, index) => {
              const isExpanded = collapsible && expanded.has(bill.name);
              return (
                <React.Fragment key={index}>
                  <tr className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-neutral-900">{bill.name}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-neutral-900">${bill.paymentAmount.toFixed(2)}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-sm text-neutral-600">{bill.dueDate}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide bg-neutral-900 text-white">
                        {bill.billType}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="text-sm text-neutral-600">{bill.allowableLateDay || 0}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {collapsible && (
                          <button
                            onClick={() => toggleExpand(bill.name)}
                            className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 mr-1" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 mr-1" />
                            )}
                            Details
                          </button>
                        )}
                        <BillActions
                          bill={bill}
                          onEditAction={onEditAction}
                          onDeleteAction={onDeleteAction}
                        />
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="px-5 py-4 bg-neutral-50 border-l-4 border-primary-500">
                        <div className="flex items-center gap-6">
                          <div>
                            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">APR</span>
                            <p className="text-sm font-semibold text-neutral-900 mt-0.5">{bill.apr.toFixed(2)}%</p>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Grace Period</span>
                            <p className="text-sm text-neutral-600 mt-0.5">
                              Up to {bill.allowableLateDay || 0} days late before penalties
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
