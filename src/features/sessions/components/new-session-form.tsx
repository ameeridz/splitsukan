"use client";

import { initialSessionFormValues } from "../session-form-model";
import { SessionForm } from "./session-form";

export function NewSessionForm() {
  return <SessionForm mode="create" initialValues={initialSessionFormValues} />;
}
