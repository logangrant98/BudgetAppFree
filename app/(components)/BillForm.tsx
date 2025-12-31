"use client";
import React, { useState } from "react";
import { Bill } from "./types";
import { v4 as uuidv4 } from "uuid";
import { Calendar, DollarSign, Clock, Percent } from "lucide-react";
import '../../styles/globals.css'

interface BillFormProps {
  setBillsAction: React.Dispatch<React.SetStateAction<Bill[]>>;
}

// Extend the Bill interface to include allowableLateDay
interface ExtendedBill extends Bill {
  allowableLateDay: number;
}

export default function BillForm({ setBillsAction }: BillFormProps) {
  const [newBill, setNewBill] = useState<ExtendedBill>({
    name: "",
    paymentAmount: 0,
    apr: 0,
    remainingBalance: 0,
    dueDate: "",
    billType: "recurring",
    allowableLateDay: 0
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericFields = ["paymentAmount", "apr", "remainingBalance", "allowableLateDay"];
    setNewBill(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? parseFloat(value) : value
    }));
  };

  const handleAddBill = () => {
    if (!newBill.name || !newBill.dueDate || newBill.paymentAmount <= 0) return;
  
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
  
    setNewBill({
      name: "",
      paymentAmount: 0,
      apr: 0,
      remainingBalance: 0,
      dueDate: "",
      billType: "recurring",
      allowableLateDay: 0
    });
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Bill</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bill Name</label>
          <input 
            type="text" 
            name="name" 
            value={newBill.name} 
            onChange={handleChange} 
            className="block w-full rounded-md border text-gray-400 border-gray-300 shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter bill name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="number" 
              name="paymentAmount" 
              value={newBill.paymentAmount} 
              onChange={handleChange} 
              className="pl-10 block w-full rounded-md border text-gray-400 border-gray-300 shadow-sm py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">APR</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Percent className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="number" 
              name="apr" 
              value={newBill.apr} 
              onChange={handleChange} 
              className="pl-10 block w-full rounded-md border text-gray-400 border-gray-300 shadow-sm py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="date" 
              name="dueDate" 
              value={newBill.dueDate} 
              onChange={handleChange} 
              className="pl-10 block w-full rounded-md border text-gray-400 border-gray-300 shadow-sm py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Allowable Late Days</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Clock className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="number" 
              name="allowableLateDay" 
              value={newBill.allowableLateDay} 
              onChange={handleChange} 
              min="0"
              max="30"
              className="pl-10 block w-full rounded-md border text-gray-400 border-gray-300 shadow-sm py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Number of days payment can be late"
            />
            
          </div>
          <p className="mt-1 text-sm text-gray-500">Maximum number of days the payment can be late</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bill Type</label>
          <select 
            name="billType" 
            value={newBill.billType} 
            onChange={handleChange} 
            className="block w-full rounded-md border text-gray-400 border-gray-300 shadow-sm py-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="recurring">Recurring (Monthly)</option>
            <option value="one-time">One-Time</option>
            <option value="other">Other</option>
          </select>
        </div>

        <button 
          onClick={handleAddBill} 
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center space-x-2"
        >
          <span>Add Bill</span>
        </button>
      </div>
    </div>
  );
}