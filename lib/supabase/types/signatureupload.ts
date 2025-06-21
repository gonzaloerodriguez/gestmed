export interface SignatureUploadProps {
  doctorId: string;
  currentSignatureUrl: string | null;
  onSuccess: () => void;
}
