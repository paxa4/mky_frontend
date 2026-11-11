import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiResendVerification, apiVerifyEmail } from "../api.js";
import { DEFAULT_RESEND_COOLDOWN_SECONDS, formatCooldown, useResendCooldown } from "../utils/useResendCooldown.js";

// Страница, на которую ведёт ссылка из письма: /verify-email?token=...
// Сразу отправляет токен на бэкенд и показывает результат.
export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [state, setState] = useState(token ? { status: "loading", message: "" } : {
    status: "error",
    message: "В ссылке нет кода подтверждения. Откройте ссылку из письма целиком.",
  });
  const [email, setEmail] = useState("");
  const [resend, setResend] = useState({ status: "idle", message: "" });
  const [cooldown, setCooldown] = useResendCooldown();
  // В режиме разработки React вызывает эффект дважды — защищаемся от двойного запроса
  const requested = useRef(false);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;
    apiVerifyEmail(token)
      .then((data) => setState({ status: "success", message: data?.message || "Почта подтверждена." }))
      .catch((err) => setState({ status: "error", message: err?.message || "Не удалось подтвердить почту." }));
  }, [token]);

  const handleResend = async (event) => {
    event.preventDefault();
    if (!email.trim() || cooldown > 0) return;
    setResend({ status: "sending", message: "" });
    try {
      const data = await apiResendVerification(email);
      setResend({ status: "sent", message: data?.message || "Письмо отправлено повторно." });
      setCooldown(data?.retry_after_seconds || DEFAULT_RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setResend({ status: "error", message: err?.message || "Не удалось отправить письмо." });
    }
  };

  return (
    <div className="verify-page">
      <style>{`
        .verify-page {
          min-height: 100vh; display: grid; place-items: center; padding: 24px 16px;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #0F172A; background: #477799;
        }
        .verify-card {
          width: min(100%, 480px); padding: 32px; border-radius: 28px; text-align: center;
          background: rgba(255,255,255,.94); box-shadow: 0 24px 70px rgba(15,23,42,.12);
        }
        .verify-card h1 { margin: 0 0 10px; font-size: 24px; line-height: 1.2; }
        .verify-card p { margin: 0 0 22px; color: #475569; line-height: 1.6; }
        .verify-btn {
          width: 100%; min-height: 50px; border: 0; border-radius: 16px; color: #fff; background: #1F5073;
          font: inherit; font-size: 16px; font-weight: 800; cursor: pointer;
        }
        .verify-btn:disabled { opacity: .5; cursor: default; }
        .verify-form { display: grid; gap: 12px; margin-top: 8px; }
        .verify-input {
          width: 100%; min-height: 48px; padding: 0 14px; border: 1.5px solid #E2E8F0; border-radius: 14px;
          background: #F8FAFC; font: inherit; font-size: 15px; box-sizing: border-box;
        }
        .verify-note { margin-top: 12px; font-size: 14px; font-weight: 700; color: #166534; }
        .verify-note.error { color: #B91C1C; }
        .verify-spinner {
          width: 36px; height: 36px; margin: 0 auto 18px; border-radius: 50%;
          border: 4px solid #E2E8F0; border-top-color: #1F5073; animation: verify-spin .8s linear infinite;
        }
        @keyframes verify-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="verify-card">
        {state.status === "loading" && (
          <>
            <div className="verify-spinner" />
            <h1>Подтверждаем почту…</h1>
          </>
        )}

        {state.status === "success" && (
          <>
            <h1>Почта подтверждена</h1>
            <p>{state.message}</p>
            <button className="verify-btn" onClick={() => navigate("/auth?tab=login")}>Войти</button>
          </>
        )}

        {state.status === "error" && (
          <>
            <h1>Не удалось подтвердить почту</h1>
            <p>{state.message}</p>
            <p>Введите адрес, указанный при регистрации, и мы отправим новую ссылку.</p>
            <form className="verify-form" onSubmit={handleResend}>
              <input
                className="verify-input"
                type="email"
                placeholder="name@example.ru"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <button className="verify-btn" disabled={resend.status === "sending" || !email.trim() || cooldown > 0}>
                {resend.status === "sending"
                  ? "Отправляем..."
                  : cooldown > 0
                    ? `Повторно через ${formatCooldown(cooldown)}`
                    : "Отправить письмо ещё раз"}
              </button>
            </form>
            {resend.message && (
              <div className={`verify-note${resend.status === "error" ? " error" : ""}`}>{resend.message}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
