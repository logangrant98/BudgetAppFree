"use client";
import React from "react";
import { Bill } from "../types";
import '../../../styles/globals.css';

interface BillActionsProps {
  bill: Bill;
  onEditAction: (bill: Bill) => void;
  onDeleteAction: (billName: string) => void;
}

export default function BillActions({ bill, onEditAction, onDeleteAction }: BillActionsProps) {
  return (
    <div className="flex space-x-2 text-center">
      <button
        onClick={() => onEditAction(bill)}
        className="bg-yellow-500 text-white py-1 px-2 rounded hover:bg-yellow-600"
      >
        Edit
      </button>
      <button
        onClick={() => onDeleteAction(bill.name)}
        className="bg-red-500 text-white py-1 px-2 rounded hover:bg-red-600"
      >
        Delete
      </button>
    </div>
  );
}
