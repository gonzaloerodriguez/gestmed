import { Patient } from "../patient";
import type { PatientRepresentative } from "../patientrepresentative";
import type { MedicalHistory } from "../medicalhistory";


export interface PatientFormProps {
  doctorId: string;
  onSuccess: (patient: Patient ) => void;
  onCancel: () => void;
  patient?: Patient;
  representative?: PatientRepresentative | null;
  medicalHistory?: MedicalHistory | null;
}