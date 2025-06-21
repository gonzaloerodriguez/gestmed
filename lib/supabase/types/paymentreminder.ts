export interface PaymentReminderProps {
  doctorId: string;
  subscriptionStatus: string;
  nextPaymentDate: string | null;
}