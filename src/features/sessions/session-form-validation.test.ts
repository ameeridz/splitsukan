import { describe, expect, it } from "vitest";

import {
  getFirstInvalidSessionField,
  sessionFormFieldOrder,
  validateSessionForm,
} from "./session-form-validation";
import type { SessionFormValues } from "./session-form-model";

function createValidSessionValues(
  overrides: Partial<SessionFormValues> = {},
): SessionFormValues {
  return {
    activityType: "badminton",
    customActivityName: "",
    date: "2026-08-29",
    startTime: "21:00",
    venue: "ABC Badminton Centre",
    note: "Court 3 and Court 4",
    ...overrides,
  };
}

describe("validateSessionForm", () => {
  it("accepts a valid Badminton session", () => {
    const values = createValidSessionValues();

    expect(validateSessionForm(values)).toEqual({});
  });

  it("requires a session date", () => {
    const values = createValidSessionValues({ date: "" });

    expect(validateSessionForm(values)).toEqual({
      date: "Select a session date.",
    });
  });

  it("requires a start time", () => {
    const values = createValidSessionValues({ startTime: "" });

    expect(validateSessionForm(values)).toEqual({
      startTime: "Select a start time.",
    });
  });

  it("requires a venue", () => {
    const values = createValidSessionValues({ venue: "" });

    expect(validateSessionForm(values)).toEqual({
      venue: "Enter a venue.",
    });
  });

  it("rejects a whitespace-only venue", () => {
    const values = createValidSessionValues({ venue: "   " });

    expect(validateSessionForm(values)).toEqual({
      venue: "Enter a venue.",
    });
  });

  it("requires a custom activity name when Other is selected", () => {
    const values = createValidSessionValues({
      activityType: "other",
      customActivityName: "",
    });

    expect(validateSessionForm(values)).toEqual({
      customActivityName: "Enter a custom activity name.",
    });
  });

  it("rejects a whitespace-only custom activity name", () => {
    const values = createValidSessionValues({
      activityType: "other",
      customActivityName: "   ",
    });

    expect(validateSessionForm(values)).toEqual({
      customActivityName: "Enter a custom activity name.",
    });
  });

  it("accepts a valid custom activity name", () => {
    const values = createValidSessionValues({
      activityType: "other",
      customActivityName: "Football",
    });

    expect(validateSessionForm(values)).toEqual({});
  });

  it("does not require a custom activity name for a listed activity", () => {
    const values = createValidSessionValues({
      activityType: "futsal",
      customActivityName: "",
    });

    expect(validateSessionForm(values)).toEqual({});
  });

  it("returns all missing required fields", () => {
    const values = createValidSessionValues({
      date: "",
      startTime: "",
      venue: "",
    });

    expect(validateSessionForm(values)).toEqual({
      date: "Select a session date.",
      startTime: "Select a start time.",
      venue: "Enter a venue.",
    });
  });
});

describe("getFirstInvalidSessionField", () => {
  it("uses a deterministic field order", () => {
    expect(sessionFormFieldOrder).toEqual([
      "customActivityName",
      "date",
      "startTime",
      "venue",
    ]);
  });

  it("returns the first invalid field", () => {
    const errors = validateSessionForm(
      createValidSessionValues({
        activityType: "other",
        customActivityName: "",
        date: "",
        startTime: "",
        venue: "",
      }),
    );

    expect(getFirstInvalidSessionField(errors)).toBe("customActivityName");
  });

  it("returns Date before Start time and Venue", () => {
    const errors = validateSessionForm(
      createValidSessionValues({
        date: "",
        startTime: "",
        venue: "",
      }),
    );

    expect(getFirstInvalidSessionField(errors)).toBe("date");
  });

  it("returns undefined when the form has no errors", () => {
    expect(getFirstInvalidSessionField({})).toBeUndefined();
  });
});
