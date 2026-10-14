"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { postJson } from "./api-client";

/**
 * The Investigate control always calls the backend. The page it navigates to
 * reads the stored investigation, so a failed model call is shown as failed
 * rather than replaced by anything client-side.
 */
export function InvestigateButton({
  companyId,
  date,
  label = "Investigate",
  variant = "primary",
}: {
  companyId: string;
  date: string;
  label?: string;
  variant?: "primary" | "accent";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);

    const result = await postJson<{ id: string }>("/api/investigations", { companyId, date });

    if (!result.ok) {
      setBusy(false);
      setError(result.error.message);
      return;
    }

    router.push(`/investigations/${result.data.id}`);
  }

  return (
    <span className="row">
      <button
        type="button"
        className={`button button-sm button-${variant}`}
        onClick={handleClick}
        disabled={busy}
      >
        {busy ? "Investigating…" : label}
      </button>
      {error ? (
        <span className="small" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
