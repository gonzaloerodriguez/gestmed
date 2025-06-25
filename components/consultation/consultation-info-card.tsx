"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorMessage } from "./error-message";
import type { ValidationErrors } from "@/lib/validation/consultation-schema";

interface ConsultationInfoCardProps {
  formData: {
    consultation_date: string;
    follow_up_date: string;
    reason_for_visit: string;
    symptoms: string;
    physical_examination: string;
  };
  errors: ValidationErrors;
  touchedFields: Set<string>;
  saving: boolean;
  onInputChange: (field: string, value: string) => void; // Cambiar de keyof a string
  onFieldTouch: (field: string) => void; // Cambiar de keyof a string
}

export function ConsultationInfoCard({
  formData,
  errors,
  touchedFields,
  saving,
  onInputChange,
  onFieldTouch,
}: ConsultationInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Información de la Consulta</CardTitle>
        <CardDescription>Detalles de la consulta médica</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="consultation_date">
              Fecha de Consulta <span className="text-destructive">*</span>
            </Label>
            <Input
              id="consultation_date"
              type="date"
              value={formData.consultation_date}
              onChange={(e) =>
                onInputChange("consultation_date", e.target.value)
              }
              onBlur={() => onFieldTouch("consultation_date")}
              className={errors.consultation_date ? "border-destructive" : ""}
              disabled={saving}
            />
            <ErrorMessage
              field="consultation_date"
              errors={errors}
              touchedFields={touchedFields}
            />
          </div>
          <div>
            <Label htmlFor="follow_up_date">Fecha de Seguimiento</Label>
            <Input
              id="follow_up_date"
              type="date"
              value={formData.follow_up_date}
              onChange={(e) => onInputChange("follow_up_date", e.target.value)}
              onBlur={() => onFieldTouch("follow_up_date")}
              className={errors.follow_up_date ? "border-destructive" : ""}
              disabled={saving}
            />
            <ErrorMessage
              field="follow_up_date"
              errors={errors}
              touchedFields={touchedFields}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="reason_for_visit">
            Motivo de la Consulta <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="reason_for_visit"
            value={formData.reason_for_visit}
            onChange={(e) => onInputChange("reason_for_visit", e.target.value)}
            onBlur={() => onFieldTouch("reason_for_visit")}
            placeholder="Motivo principal de la consulta"
            rows={2}
            className={errors.reason_for_visit ? "border-destructive" : ""}
            disabled={saving}
          />
          <ErrorMessage
            field="reason_for_visit"
            errors={errors}
            touchedFields={touchedFields}
          />
        </div>

        <div>
          <Label htmlFor="symptoms">Síntomas</Label>
          <Textarea
            id="symptoms"
            value={formData.symptoms}
            onChange={(e) => onInputChange("symptoms", e.target.value)}
            onBlur={() => onFieldTouch("symptoms")}
            placeholder="Síntomas reportados por el paciente"
            rows={3}
            className={errors.symptoms ? "border-destructive" : ""}
            disabled={saving}
          />
          <ErrorMessage
            field="symptoms"
            errors={errors}
            touchedFields={touchedFields}
          />
        </div>

        <div>
          <Label htmlFor="physical_examination">Examen Físico</Label>
          <Textarea
            id="physical_examination"
            value={formData.physical_examination}
            onChange={(e) =>
              onInputChange("physical_examination", e.target.value)
            }
            onBlur={() => onFieldTouch("physical_examination")}
            placeholder="Hallazgos del examen físico"
            rows={3}
            className={errors.physical_examination ? "border-destructive" : ""}
            disabled={saving}
          />
          <ErrorMessage
            field="physical_examination"
            errors={errors}
            touchedFields={touchedFields}
          />
        </div>
      </CardContent>
    </Card>
  );
}
