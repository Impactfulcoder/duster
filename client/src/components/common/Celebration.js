import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';

export const triggerConfetti = () => {
  try {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#d7ff2f', '#a8f35a', '#ff493f', '#72a7ff', '#ffffff'],
    });
  } catch (e) {
    // ignore
  }
};

export const CelebrationToast = ({ message = 'Shipped ✦ nice work', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 3200);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="celebration-toast">
      <span>✦</span>
      <span>{message}</span>
    </div>
  );
};
