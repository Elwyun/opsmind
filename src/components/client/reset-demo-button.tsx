"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { postJson } from "./api-client";

export function ResetDemoButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function handleClick() {
    setBusy(true);
    setMessage(null);
    setFailed(false);

    const result = await postJson<{ days: number }>("/api/demo/reset", {});
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
