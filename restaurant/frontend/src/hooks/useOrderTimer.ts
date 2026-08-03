import { useState, useEffect } from "react";
import { type OrderItem, type MenuItem } from "@/hooks/useSupabaseData";

/**
 * Calculates the longest preparation time in minutes across all items in an order.
 * If multiple items exist, the maximum preparation time is used as the overall order timer.
 */
export function calculateOrderPrepTime(
  orderItems: OrderItem[] | undefined,
  menuItems?: MenuItem[]
): number {
  if (!orderItems || orderItems.length === 0) return 15;

  let maxTime = 15;

  for (const item of orderItems) {
    let itemTime = 15; // default

    if (menuItems && menuItems.length > 0) {
      const matched = menuItems.find(
        (m) => m.name.toLowerCase().trim() === item.name.toLowerCase().trim()
      );
      if (matched && matched.preparation_time && matched.preparation_time > 0) {
        itemTime = Number(matched.preparation_time);
      }
    }

    if (itemTime > maxTime) {
      maxTime = itemTime;
    }
  }

  return maxTime;
}

/**
 * Format total remaining seconds to MM:SS display format.
 */
export function formatSecondsToMMSS(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00";
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Custom React hook for live order countdown timer.
 * Updates every second while order status is 'accepted' or 'preparing'.
 */
export function useOrderCountdown(
  estimatedReadyAt?: string,
  status?: string,
  onTimerComplete?: () => void
) {
  const getSecondsLeft = (): number => {
    if (!estimatedReadyAt || (status !== "accepted" && status !== "preparing")) {
      return 0;
    }
    const targetMs = new Date(estimatedReadyAt).getTime();
    if (isNaN(targetMs)) return 0;
    const diffSec = Math.floor((targetMs - Date.now()) / 1000);
    return Math.max(0, diffSec);
  };

  const [remainingSeconds, setRemainingSeconds] = useState<number>(getSecondsLeft);

  useEffect(() => {
    // Sync initial state
    const currentLeft = getSecondsLeft();
    setRemainingSeconds(currentLeft);

    if (currentLeft <= 0 || (status !== "accepted" && status !== "preparing")) {
      return;
    }

    const intervalId = setInterval(() => {
      const left = getSecondsLeft();
      setRemainingSeconds(left);

      if (left <= 0) {
        clearInterval(intervalId);
        if (onTimerComplete) {
          onTimerComplete();
        }
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [estimatedReadyAt, status, onTimerComplete]);

  return {
    remainingSeconds,
    formattedTime: formatSecondsToMMSS(remainingSeconds),
    isExpired: remainingSeconds <= 0 && !!estimatedReadyAt && (status === "accepted" || status === "preparing"),
  };
}
