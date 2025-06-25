import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Doctor } from "@/lib/supabase/types/doctor";

interface DoctorInfoCardProps {
  doctor: Doctor;
}

export function DoctorInfoCard({ doctor }: DoctorInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Información del Médico</CardTitle>
        <CardDescription>
          Datos del médico que realiza la consulta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Médico</Label>
            <Input
              value={`${doctor.gender === "female" ? "Dra." : "Dr."} ${doctor.full_name}`}
              disabled
              className="bg-background"
            />
          </div>
          <div>
            <Label>Especialidad</Label>
            <Input
              value={doctor.specialty || "Médico General"}
              disabled
              className="bg-background"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
