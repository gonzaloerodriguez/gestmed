import { Consultation } from "../consultations";
import { Doctor } from "../doctor";
import { Patient } from "../patient";

export interface PrescriptionFromConsultationProps {
  consultation: Consultation;
  patient: Patient;
  doctor: Doctor;
  medicalHistoryId: string;
  onSuccess: () => void;
  onCancel: () => void;
}