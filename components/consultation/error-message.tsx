import { AlertCircle } from "lucide-react";
import type { ValidationErrors } from "@/lib/validation/consultation-schema";

interface ErrorMessageProps {
  field: keyof ValidationErrors;
  errors: ValidationErrors;
  touchedFields: Set<string>;
}

export function ErrorMessage({
  field,
  errors,
  touchedFields,
}: ErrorMessageProps) {
  const error = errors[field];
  const showError = touchedFields.has(field as string) && error;

  return showError ? (
    <div className="flex items-center gap-1 text-destructive text-sm mt-1">
      <AlertCircle className="h-3 w-3" />
      <span>{error}</span>
    </div>
  ) : null;
}
