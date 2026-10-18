"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { postJson } from "./api-client";

export function ResetDemoButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function sendReset(token?: string) {
    return postJson<{ days: number }>(
      "/api/demo/reset",
      {},
      token ? { "x-demo-reset-token": token } : undefined,
    );
  }

  async function handleClick() {
    setBusy(true);
    setMessage(null);
    setFailed(false);

    let result = await sendReset();

    // A public deployment can require DEMO_RESET_TOKEN. Ask for it only when
    // the server says it is needed, so local/reset-unprotected demos stay one-click.
    if (!result.ok && result.error.code === "RESET_TOKEN_REQUIRED") {
      const token = window.prompt("This demo is protected. Enter the demo reset token:")?.trim();
      if (!token) {
        setBusy(false);
        setFailed(true);
        setMessage("Reset cancelled: a reset token is required.");
        return;
      }
      result = await sendReset(token);
    }

    setBusy(false);

    if (!result.ok) {
      setFailed(true);
      setMessage(`Reset failed: ${result.error.message}`);
      return;
    }

    setMessage(`Demo reset — ${result.data.days} simulated days restored.`);
    router.refresh();
  }

  return (
    <span className="row">
      <button type="button" className="button button-sm" onClick={handleClick} disabled={busy}>
        {busy ? "Resetting…" : "Reset demo data"}
      </button>
      {message ? (
        <span className={failed ? "small" : "small muted"} role="status">
          {message}
        </span>
      ) : null}
    </span>
  );
}
