"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { formatCurrency, formatDateLabel, formatDecimal, formatSignedPercent } from "../../lib/format";
import { addDays } from "../../lib/date";
import type { ActionDto, VerificationDto } from "../../lib/serializers";
import { patchJson, postJson } from "./api-client";

/** Records a human decision. The backend owns status timestamps. */
export function ActionCreator({ investigationId }: { investigationId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (title.trim().length < 3) {
      setError("Give the action a title of at least 3 characters.");
      return;
    }

    setBusy(true);
    setError(null);

    const result = await postJson<ActionDto>("/api/actions", {
      investigationId,
      title: title.trim(),
      ...(ownerName.trim() ? { ownerName: ownerName.trim() } : {}),
    });

    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setTitle("");
    setOwnerName("");
    router.refresh();
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <label className="field">
        Action or check to perform
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Compare cooling runtime with the baseline week"
        />
      </label>
      <label className="field">
        Owner (optional)
        <input
          value={ownerName}
          onChange={(event) => setOwnerName(event.target.value)}
          placeholder="e.g. Maintenance lead"
        />
      </label>
      {error ? (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      ) : null}
      <div>
        <button type="submit" className="button button-primary" disabled={busy}>
          {busy ? "Adding…" : "Add action"}
        </button>
      </div>
    </form>
  );
}

export function ActionControls({ action }: { action: ActionDto }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function update(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);

    const result = await patchJson<ActionDto>("/api/actions", { id: action.id, ...body });
    setBusy(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setNote("");
    router.refresh();
  }

  const isCompleted = action.status === "COMPLETED";

  return (
    <div className="stack-sm">
      <div className="button-row">
        {action.status === "OPEN" ? (
          <button
            type="button"
            className="button button-sm"
            onClick={() => update({ status: "IN_PROGRESS" })}
            disabled={busy}
          >
            Start
          </button>
        ) : null}

        {!isCompleted ? (
          <button
            type="button"
            className="button button-sm button-accent"
            onClick={() =>
              update({
                status: "COMPLETED",
                ...(note.trim() ? { completionNote: note.trim() } : {}),
              })
            }
            disabled={busy}
          >
            Mark completed
          </button>
        ) : (
          <button
            type="button"
            className="button button-sm"
            onClick={() => update({ status: "OPEN" })}
            disabled={busy}
          >
            Reopen
          </button>
        )}
      </div>

      {!isCompleted ? (
        <label className="field">
          Completion note
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What was checked, and what was found?"
          />
        </label>
      ) : null}

      {error ? (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function VerificationForm({
  action,
  anomalyDate,
}: {
  action: ActionDto;
  anomalyDate: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    beforeFrom: addDays(anomalyDate, -11),
    beforeTo: addDays(anomalyDate, -1),
    afterFrom: addDays(anomalyDate, 1),
    afterTo: addDays(anomalyDate, 7),
  });
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationDto | null>(null);

  const disabled = action.status !== "COMPLETED";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const response = await postJson<VerificationDto>("/api/verifications", {
      actionItemId: action.id,
      ...form,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });

    setBusy(false);
    if (!response.ok) {
      setError(response.error.message);
      return;
    }

    setResult(response.data);
    setNotes("");
    router.refresh();
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      {disabled ? (
        <p className="notice notice-warning">
          Mark this action completed before recording a before/after comparison.
        </p>
      ) : null}

      <div className="field-grid">
        <label className="field">
          Before from
          <input
            type="date"
            value={form.beforeFrom}
            onChange={(event) => setForm({ ...form, beforeFrom: event.target.value })}
            disabled={disabled}
          />
        </label>
        <label className="field">
          Before to
          <input
            type="date"
            value={form.beforeTo}
            onChange={(event) => setForm({ ...form, beforeTo: event.target.value })}
            disabled={disabled}
          />
        </label>
        <label className="field">
          After from
          <input
            type="date"
            value={form.afterFrom}
            onChange={(event) => setForm({ ...form, afterFrom: event.target.value })}
            disabled={disabled}
          />
        </label>
        <label className="field">
          After to
          <input
            type="date"
            value={form.afterTo}
            onChange={(event) => setForm({ ...form, afterTo: event.target.value })}
            disabled={disabled}
          />
        </label>
      </div>

      <label className="field">
        Notes (optional)
        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="e.g. Measured after the filter was replaced"
          disabled={disabled}
        />
      </label>

      {error ? (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      ) : null}

      <div>
        <button type="submit" className="button" disabled={disabled || busy}>
          {busy ? "Recording…" : "Record before/after comparison"}
        </button>
      </div>

      {result ? (
        <div className="notice notice-info" role="status">
          <div className="notice-title">
            Observed change: {formatSignedPercent(result.changePercent ?? 0, 1)}
          </div>
          Before {formatDateLabel(result.beforeFrom)} – {formatDateLabel(result.beforeTo)}:{" "}
          {formatDecimal(result.beforeIntensity ?? 0, 4)} kWh/unit · After{" "}
          {formatDateLabel(result.afterFrom)} – {formatDateLabel(result.afterTo)}:{" "}
          {formatDecimal(result.afterIntensity ?? 0, 4)} kWh/unit
          <div className="small" style={{ marginTop: 6 }}>
            {result.caveat}
          </div>
        </div>
      ) : null}
    </form>
  );
}

/** Small helper so callers do not import formatters just for a label. */
export function formattedCost(value: number | null, currency: string): string {
  return value === null ? "—" : formatCurrency(value, currency);
}
