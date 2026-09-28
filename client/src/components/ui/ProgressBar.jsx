import React from 'react';

export default function ProgressBar({ current, target, label }) {
  const percentage = Math.min(100, Math.max(0, (current / (target || 1)) * 100));
  const isComplete = percentage >= 100;

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600">{label}</span>
          <span className="font-medium">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ease-out ${isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
