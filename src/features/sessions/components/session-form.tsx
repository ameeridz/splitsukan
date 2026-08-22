"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  Clock3,
  LoaderCircle,
  MapPin,
  NotebookText,
  Trophy,
} from "lucide-react";

import { useApplicationStore } from "../../../stores/application-store";
import {
  activityOptions,
  getActivityLabel,
  isCustomActivity,
  type SessionFormErrors,
  type SessionFormValues,
} from "../session-form-model";
import {
  getFirstInvalidSessionField,
  validateSessionForm,
} from "../session-form-validation";

type SessionFormProps = {
  mode: "create" | "edit";
  initialValues: SessionFormValues;
  sessionId?: string;
};

const fieldIds: Partial<Record<keyof SessionFormValues, string>> = {
  customActivityName: "custom-activity-name",
  date: "session-date",
  startTime: "session-start-time",
  venue: "session-venue",
};

function focusFirstInvalidField(errors: SessionFormErrors) {
  const firstInvalidField = getFirstInvalidSessionField(errors);
  const fieldId = firstInvalidField ? fieldIds[firstInvalidField] : undefined;

  if (fieldId) {
    window.requestAnimationFrame(() => {
      document.getElementById(fieldId)?.focus();
    });
  }
}

export function SessionForm({
  mode,
  initialValues,
  sessionId,
}: SessionFormProps) {
  const router = useRouter();
  const createSession = useApplicationStore((state) => state.createSession);
  const updateSession = useApplicationStore((state) => state.updateSession);
  const hasHydrated = useApplicationStore((state) => state.hasHydrated);

  const [values, setValues] = useState<SessionFormValues>(initialValues);
  const [errors, setErrors] = useState<SessionFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const isEditMode = mode === "edit";
  const title = isEditMode ? "Edit sports session" : "Create a sports session";
  const eyebrow = isEditMode ? "EDIT SESSION" : "SESSION DETAILS";
  const submitLabel = isEditMode ? "Save Changes" : "Create Session";
  const submittingLabel = isEditMode ? "Saving Changes..." : "Creating Session...";

  function updateField<Field extends keyof SessionFormValues>(
    field: Field,
    value: SessionFormValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setSubmissionError(null);

    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function handleReset() {
    setValues(initialValues);
    setErrors({});
    setSubmissionError(null);
    setIsSubmitting(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !hasHydrated) return;

    const nextErrors = validateSessionForm(values);
    setErrors(nextErrors);
    setSubmissionError(null);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidField(nextErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode) {
        if (!sessionId) throw new Error("Missing session ID for edit mode.");
        const updatedSession = updateSession(sessionId, values);
        if (!updatedSession) throw new Error("Session no longer exists.");
        router.push(`/sessions/${updatedSession.id}`);
      } else {
        const createdSession = createSession(values);
        router.push(`/sessions/${createdSession.id}`);
      }
    } catch (error) {
      console.error("Unable to save the SplitSukan session.", error);
      setSubmissionError(
        "The session could not be saved. Your entered values are still available.",
      );
      setIsSubmitting(false);
    }
  }

  const activityLabel = isCustomActivity(values.activityType)
    ? values.customActivityName.trim() || "Custom activity"
    : getActivityLabel(values.activityType);
  const errorCount = Object.keys(errors).length;
  const inputBase =
    "mt-2 min-h-11 w-full rounded-xl border bg-input px-3 text-sm text-foreground outline-none transition-colors placeholder:text-subtle-foreground hover:bg-input-hover focus:ring-2 focus:ring-focus-ring";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <form
        aria-labelledby="session-form-title"
        noValidate
        onSubmit={handleSubmit}
        onReset={handleReset}
        className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7"
      >
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-primary">
            {eyebrow}
          </p>
          <h2
            id="session-form-title"
            className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            {title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            {isEditMode
              ? "Update the activity, schedule, venue, or optional note."
              : "Add the activity, schedule, and venue first. Participants and shared expenses can be added afterwards."}
          </p>
        </div>

        {errorCount > 0 ? (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-danger/40 bg-danger-surface p-4 text-danger-foreground"
          >
            <AlertCircle aria-hidden="true" size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold">
                Review {errorCount === 1 ? "this field" : "these fields"}{" "}
                before continuing.
              </p>
              <p className="mt-1 text-xs leading-5 opacity-85">
                The first invalid field has been focused for correction.
              </p>
            </div>
          </div>
        ) : null}

        {submissionError ? (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-danger/40 bg-danger-surface p-4 text-sm font-medium text-danger-foreground"
          >
            {submissionError}
          </div>
        ) : null}

        <fieldset className="mt-7">
          <legend className="flex items-center gap-2 text-sm font-bold">
            <Trophy aria-hidden="true" size={19} /> Activity
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {activityOptions.map((option) => {
              const selected = values.activityType === option.value;
              return (
                <label
                  key={option.value}
                  className={[
                    "flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-center text-sm font-semibold transition-colors",
                    "focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
                    selected
                      ? "border-primary bg-primary/12 text-primary"
                      : "border-border bg-surface-muted text-muted-foreground hover:border-border-strong hover:text-foreground",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="activityType"
                    value={option.value}
                    checked={selected}
                    onChange={() => updateField("activityType", option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        {isCustomActivity(values.activityType) ? (
          <div className="mt-5">
            <label htmlFor="custom-activity-name" className="text-sm font-bold">
              Custom activity name
            </label>
            <input
              id="custom-activity-name"
              value={values.customActivityName}
              onChange={(event) =>
                updateField("customActivityName", event.target.value)
              }
              placeholder="Example: Football"
              aria-invalid={Boolean(errors.customActivityName)}
              aria-describedby={
                errors.customActivityName ? "custom-activity-error" : undefined
              }
              className={`${inputBase} ${errors.customActivityName ? "border-danger" : "border-border focus:border-primary"}`}
            />
            {errors.customActivityName ? (
              <p id="custom-activity-error" className="mt-2 text-sm font-medium text-danger">
                {errors.customActivityName}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="session-date" className="flex items-center gap-2 text-sm font-bold">
              <CalendarDays aria-hidden="true" size={19} /> Date
            </label>
            <input
              id="session-date"
              type="date"
              value={values.date}
              onChange={(event) => updateField("date", event.target.value)}
              aria-invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? "session-date-error" : undefined}
              className={`${inputBase} ${errors.date ? "border-danger" : "border-border focus:border-primary"}`}
            />
            {errors.date ? (
              <p id="session-date-error" className="mt-2 text-sm font-medium text-danger">
                {errors.date}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="session-start-time" className="flex items-center gap-2 text-sm font-bold">
              <Clock3 aria-hidden="true" size={19} /> Start time
            </label>
            <input
              id="session-start-time"
              type="time"
              value={values.startTime}
              onChange={(event) => updateField("startTime", event.target.value)}
              aria-invalid={Boolean(errors.startTime)}
              aria-describedby={errors.startTime ? "session-time-error" : undefined}
              className={`${inputBase} ${errors.startTime ? "border-danger" : "border-border focus:border-primary"}`}
            />
            {errors.startTime ? (
              <p id="session-time-error" className="mt-2 text-sm font-medium text-danger">
                {errors.startTime}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="session-venue" className="flex items-center gap-2 text-sm font-bold">
            <MapPin aria-hidden="true" size={19} /> Venue
          </label>
          <input
            id="session-venue"
            value={values.venue}
            onChange={(event) => updateField("venue", event.target.value)}
            placeholder="Example: Dewan Bunga Lili"
            aria-invalid={Boolean(errors.venue)}
            aria-describedby={errors.venue ? "session-venue-error" : undefined}
            className={`${inputBase} ${errors.venue ? "border-danger" : "border-border focus:border-primary"}`}
          />
          {errors.venue ? (
            <p id="session-venue-error" className="mt-2 text-sm font-medium text-danger">
              {errors.venue}
            </p>
          ) : null}
        </div>

        <div className="mt-5">
          <label htmlFor="session-note" className="flex items-center gap-2 text-sm font-bold">
            <NotebookText aria-hidden="true" size={19} /> Note
            <span className="font-normal text-muted-foreground">Optional</span>
          </label>
          <textarea
            id="session-note"
            value={values.note}
            onChange={(event) => updateField("note", event.target.value)}
            placeholder="Example: Court 3 and Court 4"
            rows={4}
            className="mt-2 w-full resize-y rounded-xl border border-border bg-input px-3 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-subtle-foreground hover:bg-input-hover focus:border-primary focus:ring-2 focus:ring-focus-ring"
          />
        </div>

        {!hasHydrated ? (
          <p role="status" className="mt-6 text-sm text-muted-foreground">
            Restoring local SplitSukan data...
          </p>
        ) : null}

        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
          <button
            type="reset"
            disabled={isSubmitting}
            className="min-h-11 rounded-xl border border-border-strong bg-surface px-5 text-sm font-semibold transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={!hasHydrated || isSubmitting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <LoaderCircle
                aria-hidden="true"
                size={18}
                className="animate-spin motion-reduce:animate-none"
              />
            ) : null}
            {isSubmitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>

      <aside className="h-fit rounded-3xl border border-border bg-surface p-5 shadow-sm xl:sticky xl:top-24">
        <p className="text-sm font-semibold tracking-wide text-primary">LIVE PREVIEW</p>
        <h2 className="mt-2 text-xl font-bold tracking-tight">{activityLabel}</h2>
        <dl className="mt-5 space-y-4">
          <div><dt className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">Date</dt><dd className="mt-1 text-sm font-medium">{values.date || "Not selected"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">Start time</dt><dd className="mt-1 text-sm font-medium">{values.startTime || "Not selected"}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">Venue</dt><dd className="mt-1 wrap-break-word text-sm font-medium">{values.venue.trim() || "Not entered"}</dd></div>
          {values.note.trim() ? (
            <div><dt className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">Note</dt><dd className="mt-1 whitespace-pre-wrap wrap-break-word text-sm leading-6">{values.note.trim()}</dd></div>
          ) : null}
        </dl>
        <div className="mt-6 rounded-2xl bg-info-surface p-4 text-info-foreground">
          <p className="text-sm font-semibold">
            {isEditMode ? "Updates save locally" : "Sessions save locally"}
          </p>
          <p className="mt-1 text-xs leading-5 opacity-80">
            {isEditMode
              ? "Valid changes replace this session while preserving its ID and creation time."
              : "A valid session is stored on this device and opened immediately."}
          </p>
        </div>
      </aside>
    </div>
  );
}
