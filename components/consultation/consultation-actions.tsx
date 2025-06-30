"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Archive,
  ArchiveRestore,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
import { useRouter } from "next/navigation";

interface ConsultationActionsProps {
  consultationId: string;
  patientName: string;
  onArchived?: () => void;
  onRestored?: () => void;
  isArchived?: boolean;
}

export function ConsultationActions({
  consultationId,
  patientName,

  onRestored,
  isArchived = false,
}: ConsultationActionsProps) {
  const router = useRouter();
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToastEnhanced();

  const handleRestore = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from("consultations")
        .update({ is_active: !isArchived })
        .eq("id", consultationId);

      if (error) throw error;

      const action = "restaurada";
      showSuccess(
        `Consulta ${action}`,
        `La consulta de ${patientName} ha sido ${action} exitosamente.`
      );

      // Llamar callback si existe
      if (isArchived && onRestored) {
        onRestored();
      }

      setShowRestoreDialog(false);
    } catch (error: any) {
      const action = "restaurar";
      showError(
        `Error al ${action}`,
        `No se pudo ${action} la consulta. Inténtalo de nuevo.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleView = () => {
    isArchived
      ? router.push(`/dashboard/archived/consultations/${consultationId}`)
      : router.push(`/dashboard/consultations/${consultationId}`);
  };

  const handleEdit = () => {
    router.push(`/dashboard/consultations/${consultationId}/edit`);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleView}>
            <Eye className="mr-2 h-4 w-4" />
            Ver Consulta
          </DropdownMenuItem>

          {!isArchived && (
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {isArchived ? (
            <DropdownMenuItem
              onClick={() => setShowRestoreDialog(true)}
              className="text-green-600 focus:text-green-600"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restaurar
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restaurar consulta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción restaurará la consulta de{" "}
              <strong>{patientName}</strong> y volverá a estar disponible en la
              lista de consultas activas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "Restaurando..." : "Restaurar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
