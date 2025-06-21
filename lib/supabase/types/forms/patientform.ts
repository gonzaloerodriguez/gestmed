import { Patient } from "../patient";

 export interface PatientFormProps {
  doctorId: string;
  onSuccess: (patient: Patient ) => void;
  onCancel: () => void;
}