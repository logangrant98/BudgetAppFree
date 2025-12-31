"use client";
import React, { useState } from "react";
import { Bill } from "../types";
import BillActions from "./BillActions";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import '../../../styles/globals.css';

interface BillsTableProps {
  bills: Bill[];
  onEditAction: (bill: Bill) => void;
  onDeleteAction: (billName: string) => void;
  collapsible?: boolean;
}

export default function BillsTable({ bills, onEditAction, onDeleteAction, collapsible }: BillsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (!bills.length) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">No bills entered yet.</p>
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
    <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Name</th>
            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Payment Amount</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Due Date</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Type</th>
            <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">Late Days</th>
            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {bills.map((bill, index) => {
            const isExpanded = collapsible && expanded.has(bill.name);
            return (
              <React.Fragment key={index}>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {bill.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    ${bill.paymentAmount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bill.dueDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {bill.billType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    <div className="flex items-center justify-center">
                      <Clock className="w-4 h-4 text-gray-400 mr-1" />
                      <span>{bill.allowableLateDay || 0} days</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end space-x-3">
                      {collapsible && (
                        <button
                          onClick={() => toggleExpand(bill.name)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 mr-1" />
                          ) : (
                            <ChevronDown className="w-4 h-4 mr-1" />
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
                    <td colSpan={7} className="px-6 py-4 bg-gray-50">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-500">APR:</span>
                          <span className="text-sm text-gray-900">{bill.apr.toFixed(2)}%</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Payment can be up to {bill.allowableLateDay || 0} days late before penalties.
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
  );
}