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
import { ErrorMessage } from "./error-message";
import type { ValidationErrors } from "@/lib/validation/consultation-schema";

interface VitalSignsCardProps {
  formData: {
    blood_pressure: string;
    temperature: string;
    heart_rate: string;
    respiratory_rate: string;
    height: string;
    weight: string;
  };
  errors: ValidationErrors;
  touchedFields: Set<string>;
  saving: boolean;
  onInputChange: (field: string, value: string) => void; // Cambiar de keyof a string
  onFieldTouch: (field: string) => void; // Cambiar de keyof a string
}

export function VitalSignsCard({
  formData,
  errors,
  touchedFields,
  saving,
  onInputChange,
  onFieldTouch,
}: VitalSignsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Signos Vitales</CardTitle>
        <CardDescription>
          Mediciones tomadas durante la consulta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="blood_pressure">Presión Arterial</Label>
            <Input
              id="blood_pressure"
              value={formData.blood_pressure}
              onChange={(e) => onInputChange("blood_pressure", e.target.value)}
              onBlur={() => onFieldTouch("blood_pressure")}
              placeholder="120/80"
              className={errors.blood_pressure ? "border-destructive" : ""}
              disabled={saving}
            />
            <ErrorMessage
              field="blood_pressure"
              errors={errors}
              touchedFields={touchedFields}
            />
          </div>
          <div>
            <Label htmlFor="temperature">Temperatura (°C)</Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              value={formData.temperature}
              onChange={(e) => onInputChange("temperature", e.target.value)}
              onBlur={() => onFieldTouch("temperature")}
              placeholder="36.5"
              className={errors.temperature ? "border-destructive" : ""}
              disabled={saving}
            />
            <ErrorMessage
              field="temperature"
              errors={errors}
              touchedFields={touchedFields}
            />
          </div>
          <div>
            <Label htmlFor="heart_rate">Frecuencia Cardíaca</Label>
            <Input
              id="heart_rate"
              type="number"
              value={formData.heart_rate}
              onChange={(e) => onInputChange("heart_rate", e.target.value)}
              onBlur={() => onFieldTouch("heart_rate")}
              placeholder="75"
              className={errors.heart_rate ? "border-destructive" : ""}
              disabled={saving}
            />
            <ErrorMessage
              field="heart_rate"
              errors={errors}
              touchedFields={touchedFields}
            />
          </div>
          <div>
            <Label htmlFor="respiratory_rate">Frecuencia Respiratoria</Label>
            <Input
              id="respiratory_rate"
              type="number"
              value={formData.respiratory_rate}
              onChange={(e) =>
                onInputChange("respiratory_rate", e.target.value)
              }
              onBlur={() => onFieldTouch("respiratory_rate")}
              placeholder="16"
              className={errors.respiratory_rate ? "border-destructive" : ""}
              disabled={saving}
            />
            <ErrorMessage
              field="respiratory_rate"
              errors={errors}
              touchedFields={touchedFields}
            />
          </div>
          <div>
            <Label htmlFor="height">Altura (cm)</Label>
            <Input
              id="height"
              type="number"
              step="0.1"
              value={formData.height}
              onChange={(e) => onInputChange("height", e.target.value)}
              onBlur={() => onFieldTouch("height")}
              placeholder="170"
              className={errors.height ? "border-destructive" : ""}
              disabled={saving}
            />
            <ErrorMessage
              field="height"
              errors={errors}
              touchedFields={touchedFields}
            />
          </div>
          <div>
            <Label htmlFor="weight">Peso (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              value={formData.weight}
              onChange={(e) => onInputChange("weight", e.target.value)}
              onBlur={() => onFieldTouch("weight")}
              placeholder="70"
              className={errors.weight ? "border-destructive" : ""}
              disabled={saving}
            />
            <ErrorMessage
              field="weight"
              errors={errors}
              touchedFields={touchedFields}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
