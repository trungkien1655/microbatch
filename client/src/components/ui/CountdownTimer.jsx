import React, { useState, useEffect } from 'react';

export default function CountdownTimer({ expiresAt }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    
    const calculateTimeLeft = () => {
      const diff = new Date(expiresAt).getTime() - new Date().getTime();
      return Math.max(0, Math.floor(diff / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  if (timeLeft <= 0) {
    return <span className="font-bold text-red-500">Hết giờ</span>;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft < 120; // less than 2 minutes

  return (
    <span className={`font-mono font-bold ${isUrgent ? 'text-red-500 animate-pulse' : 'text-emerald-600'}`}>
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}
