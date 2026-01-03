"use client";
import React from "react";
import { Bill } from "../types";
import { Pencil, Trash2 } from "lucide-react";
import '../../../styles/globals.css';

interface BillActionsProps {
  bill: Bill;
  onEditAction: (bill: Bill) => void;
  onDeleteAction: (billId: string) => void;
}

export default function BillActions({ bill, onEditAction, onDeleteAction }: BillActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onEditAction(bill)}
        className="inline-flex items-center justify-center w-8 h-8 rounded bg-neutral-100 text-neutral-600 hover:bg-primary-500 hover:text-neutral-900 transition-colors"
        title="Edit bill"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onDeleteAction(bill.id)}
        className="inline-flex items-center justify-center w-8 h-8 rounded bg-neutral-100 text-neutral-600 hover:bg-red-500 hover:text-white transition-colors"
        title="Delete bill"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
