export interface PaymentUploadProps {
  doctorId: string;
  currentPaymentUrl: string | null;
  onSuccess: () => void;
}