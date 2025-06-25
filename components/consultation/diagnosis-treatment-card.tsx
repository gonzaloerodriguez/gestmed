"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorMessage } from "./error-message";
import type { ValidationErrors } from "@/lib/validation/consultation-schema";

interface DiagnosisTreatmentCardProps {
  formData: {
    diagnosis: string;
    treatment_plan: string;
    notes: string;
  };
  errors: ValidationErrors;
  touchedFields: Set<string>;
  saving: boolean;
  onInputChange: (field: string, value: string) => void; // Cambiar de keyof a string
  onFieldTouch: (field: string) => void; // Cambiar de keyof a string
}

export function DiagnosisTreatmentCard({
  formData,
  errors,
  touchedFields,
  saving,
  onInputChange,
  onFieldTouch,
}: DiagnosisTreatmentCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagnóstico y Tratamiento</CardTitle>
        <CardDescription>Conclusiones y plan de tratamiento</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="diagnosis">Diagnóstico</Label>
          <Textarea
            id="diagnosis"
            value={formData.diagnosis}
            onChange={(e) => onInputChange("diagnosis", e.target.value)}
            onBlur={() => onFieldTouch("diagnosis")}
            placeholder="Diagnóstico médico"
            rows={3}
            className={errors.diagnosis ? "border-destructive" : ""}
            disabled={saving}
          />
          <ErrorMessage
            field="diagnosis"
            errors={errors}
            touchedFields={touchedFields}
          />
        </div>

        <div>
          <Label htmlFor="treatment_plan">Plan de Tratamiento</Label>
          <Textarea
            id="treatment_plan"
            value={formData.treatment_plan}
            onChange={(e) => onInputChange("treatment_plan", e.target.value)}
            onBlur={() => onFieldTouch("treatment_plan")}
            placeholder="Plan de tratamiento recomendado"
            rows={4}
            className={errors.treatment_plan ? "border-destructive" : ""}
            disabled={saving}
          />
          <ErrorMessage
            field="treatment_plan"
            errors={errors}
            touchedFields={touchedFields}
          />
        </div>

        <div>
          <Label htmlFor="notes">Notas Adicionales</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => onInputChange("notes", e.target.value)}
            onBlur={() => onFieldTouch("notes")}
            placeholder="Observaciones adicionales"
            rows={3}
            className={errors.notes ? "border-destructive" : ""}
            disabled={saving}
          />
          <ErrorMessage
            field="notes"
            errors={errors}
            touchedFields={touchedFields}
          />
        </div>
      </CardContent>
    </Card>
  );
}
