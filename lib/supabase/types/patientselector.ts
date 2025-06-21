import { PatientSelectorItem } from "./patient";

export interface PatientSelectorProps {
  onPatientSelect: (patient: PatientSelectorItem | null) => void;
  selectedPatient: PatientSelectorItem | null;
  allowOneTime?: boolean; // Para recetas de una sola vez
}