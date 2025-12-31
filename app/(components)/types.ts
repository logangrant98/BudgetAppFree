export interface Bill {
    id?: string;
    name: string;
    paymentAmount: number;
    apr: number;
    remainingBalance: number;
    dueDate: string;
    billType: "recurring" | "one-time" | "other";
    allowableLateDay?: number;
    instanceId?: string;  // Add this line
  }
  
  export interface Income {
    amount: number;
    frequency: "weekly" | "biweekly" | "monthly";
    lastPayDate: string;
    miscPercent: number;
    monthsToShow: number;
  }