"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, UserRound, UsersRound, X } from "lucide-react";

import { useApplicationStore } from "../../../stores/application-store";
import {
  getParticipationWeightLabel,
  type ParticipantId,
  type ParticipationWeight,
} from "../participant-model";

type ParticipantManagerProps = {
  sessionId: string;
};

type FormState = {
  displayName: string;
  participationWeight: ParticipationWeight;
};

const emptyForm: FormState = {
  displayName: "",
  participationWeight: "full",
};

function getErrorMessage(reason: string) {
  if (reason === "invalid-name") return "Enter a participant name.";
  if (reason === "duplicate-name") return "This participant is already in the session.";
  if (reason === "participant-not-found") return "This participant is no longer available.";
  return "The participant could not be saved. Please try again.";
}

export function ParticipantManager({ sessionId }: ParticipantManagerProps) {
  const session = useApplicationStore((state) =>
    state.sessions.find((item) => item.id === sessionId),
  );
  const addParticipant = useApplicationStore((state) => state.addParticipant);
  const updateParticipant = useApplicationStore((state) => state.updateParticipant);
  const removeParticipant = useApplicationStore((state) => state.removeParticipant);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingParticipantId, setEditingParticipantId] =
    useState<ParticipantId | null>(null);
  const [removingParticipantId, setRemovingParticipantId] =
    useState<ParticipantId | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const participants = useMemo(
    () =>
      [...(session?.participants ?? [])].sort(
        (first, second) => first.participantOrder - second.participantOrder,
      ),
    [session?.participants],
  );

  if (!session) return null;

  function openCreateForm() {
    setEditingParticipantId(null);
    setForm(emptyForm);
    setError(null);
    setIsFormOpen(true);
  }

  function openEditForm(participantId: ParticipantId) {
    const participant = participants.find((item) => item.id === participantId);
    if (!participant) return;

    setEditingParticipantId(participant.id);
    setForm({
      displayName: participant.displayName,
      participationWeight:
        participant.defaultWeightUnits === 500 ? "half" : "full",
    });
    setError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingParticipantId(null);
    setForm(emptyForm);
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = editingParticipantId
      ? updateParticipant(sessionId, editingParticipantId, form)
      : addParticipant(sessionId, form);

    if (!result.ok) {
      setError(getErrorMessage(result.reason));
      return;
    }

    closeForm();
  }

  function confirmRemoval() {
    if (!removingParticipantId) return;

    const removed = removeParticipant(sessionId, removingParticipantId);
    if (!removed) {
      setError("The participant could not be removed. Please try again.");
    }
    setRemovingParticipantId(null);
  }

  const removingParticipant = participants.find(
    (participant) => participant.id === removingParticipantId,
  );

  return (
    <section
      aria-labelledby="participants-title"
      className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-primary">
            PARTICIPANTS
          </p>
          <h2 id="participants-title" className="mt-2 text-xl font-bold tracking-tight">
            Who is joining?
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Add participants and choose a Full or Half default share for each person.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <Plus aria-hidden="true" size={18} strokeWidth={2.4} />
          Add Participant
        </button>
      </div>

      {participants.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border-strong bg-surface-muted p-6 text-center">
          <UsersRound
            aria-hidden="true"
            size={28}
            className="mx-auto text-primary"
          />
          <h3 className="mt-3 font-bold tracking-tight">No participants yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            Add everyone who may share expenses in this session.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {participants.map((participant) => (
            <li
              key={participant.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface-muted p-3 sm:p-4"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <UserRound aria-hidden="true" size={19} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {participant.displayName}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Default share: {getParticipationWeightLabel(participant.defaultWeightUnits)}
                </p>
              </div>

              <span className="hidden rounded-full bg-info-surface px-3 py-1 text-xs font-semibold text-info-foreground sm:inline-flex">
                {getParticipationWeightLabel(participant.defaultWeightUnits)}
              </span>

              <button
                type="button"
                onClick={() => openEditForm(participant.id)}
                aria-label={`Edit ${participant.displayName}`}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
              >
                <Pencil aria-hidden="true" size={18} />
              </button>

              <button
                type="button"
                onClick={() => setRemovingParticipantId(participant.id)}
                aria-label={`Remove ${participant.displayName}`}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-danger transition-colors hover:bg-danger-surface"
              >
                <Trash2 aria-hidden="true" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {isFormOpen ? (
        <div className="mt-6 rounded-2xl border border-border-strong bg-surface-muted p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold tracking-tight">
              {editingParticipantId ? "Edit participant" : "Add participant"}
            </h3>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Close participant form"
              className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="participant-name" className="text-sm font-bold">
                Participant name
              </label>
              <input
                id="participant-name"
                value={form.displayName}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }));
                  setError(null);
                }}
                autoFocus
                autoComplete="off"
                placeholder="Example: Amir"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "participant-form-error" : undefined}
                className={[
                  "mt-2 min-h-11 w-full rounded-xl border bg-input px-3 text-sm",
                  "text-foreground outline-none transition-colors",
                  "placeholder:text-subtle-foreground hover:bg-input-hover",
                  "focus:ring-2 focus:ring-focus-ring",
                  error ? "border-danger" : "border-border focus:border-primary",
                ].join(" ")}
              />
              {error ? (
                <p id="participant-form-error" className="mt-2 text-sm font-medium text-danger">
                  {error}
                </p>
              ) : null}
            </div>

            <fieldset>
              <legend className="text-sm font-bold">Default participation</legend>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {(["full", "half"] as const).map((weight) => (
                  <label
                    key={weight}
                    className={[
                      "flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-semibold",
                      "focus-within:ring-2 focus-within:ring-focus-ring",
                      form.participationWeight === weight
                        ? "border-primary bg-primary/12 text-primary"
                        : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="participationWeight"
                      value={weight}
                      checked={form.participationWeight === weight}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          participationWeight: weight,
                        }))
                      }
                      className="sr-only"
                    />
                    {weight === "full" ? "Full" : "Half"}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                className="min-h-11 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
              >
                {editingParticipantId ? "Save Changes" : "Add Participant"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {removingParticipant ? (
        <div className="fixed inset-0 z-100 flex items-end justify-center bg-overlay p-4 sm:items-center">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="remove-participant-title"
            aria-describedby="remove-participant-description"
            className="w-full max-w-md rounded-3xl border border-border bg-surface p-5 shadow-[0_1.5rem_4rem_var(--shadow-color)]"
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-danger-surface text-danger-foreground">
              <Trash2 aria-hidden="true" size={22} />
            </span>
            <h3 id="remove-participant-title" className="mt-5 text-xl font-bold tracking-tight">
              Remove {removingParticipant.displayName}?
            </h3>
            <p id="remove-participant-description" className="mt-2 text-sm leading-6 text-muted-foreground">
              This removes the participant from this session. This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRemovingParticipantId(null)}
                className="min-h-11 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemoval}
                className="min-h-11 rounded-xl bg-danger px-4 text-sm font-semibold text-white hover:opacity-90"
              >
                Remove Participant
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
