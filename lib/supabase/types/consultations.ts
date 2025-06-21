import { Prescription } from "./prescription";

export type Consultation = {
  id: string;
  medical_history_id: string;
  doctor_id: string;
  consultation_date: string;
  reason_for_visit: string;
  symptoms?: string;
  physical_examination?: string;
  diagnosis?: string;
  treatment_plan?: string;
  follow_up_date?: string;
  notes?: string;
  vital_signs?: VitalSigns;
  created_at: string;
  updated_at: string;
};


export interface ConsultationStats {
  totalConsultations: number;
  weeklyConsultations: number;
  monthlyConsultations: number;
  dailyConsultations: Array<{
    date: string;
    count: number;
  }>;
  consultationsByDoctor: Array<{
    doctorName: string;
    count: number;
  }>;
  consultationTrend: Array<{
    period: string;
    consultations: number;
  }>;
}

export type ConsultationWithPatient = Consultation & {
  patient?: {
    full_name: string;
    cedula: string;
  };
};

export interface ConsultationWithPatientFlat extends Pick<
  Consultation,
  "id" | "consultation_date" | "reason_for_visit" | "diagnosis" | "created_at"
> {
  medical_history: {
    patient: {
      full_name: string;
      cedula: string;
    };
  };
}

export type ConsultationWithPrescriptions = Consultation & {
  prescriptions?: Prescription[]
}

export type VitalSigns = {
  weight?: number | null
  height?: number | null
  bp?: string | null
  temp?: number | null
  heart_rate?: number | null
  respiratory_rate?: number | null
}