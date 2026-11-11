import { useEffect, useState } from "react";

// Обратный отсчёт для кнопки «отправить письмо ещё раз».
// Это только удобство для пользователя: настоящее ограничение — на сервере.
export function useResendCooldown() {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  return [secondsLeft, setSecondsLeft];
}

export function formatCooldown(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

export const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;
