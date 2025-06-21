import { Patient } from "../patient";

export interface ConsultationFormProps {
  medicalHistoryId: string;
  doctorId: string;
  patient: Patient;
  onSuccess: () => void;
  onCancel: () => void;
}