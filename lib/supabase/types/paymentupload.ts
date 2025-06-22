export interface PaymentUploadProps {
  doctorId: string;
  currentPaymentUrl: string | null;
  onSuccess: () => void;
}


export interface PaymentProof {
  name: string;
  size: number;
  created_at: string;
  updated_at: string;
  filePath: string;
  signedUrl: string | null;
  fileType: "pdf" | "image";
}
