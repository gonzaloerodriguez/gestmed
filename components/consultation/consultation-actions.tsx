"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import { MoreHorizontal, Edit, Archive, Eye } from "lucide-react";
import { useConsultationOperations } from "@/hooks/use-consultation-operations";

interface ConsultationActionsProps {
  consultationId: string;
  patientName: string;
  onArchived?: () => void;
}

export function ConsultationActions({
  consultationId,
  patientName,
  onArchived,
}: ConsultationActionsProps) {
  const router = useRouter();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const { loading, archiveConsultation } = useConsultationOperations();

  const handleView = () => {
    router.push(`/dashboard/consultations/${consultationId}`);
  };

  const handleEdit = () => {
    router.push(`/dashboard/consultations/${consultationId}/edit`);
  };

  const handleArchive = async () => {
    const success = await archiveConsultation(consultationId, patientName);

    if (success) {
      setShowArchiveDialog(false);
      // Llamar callback si existe
      if (onArchived) {
        onArchived();
      }
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menú</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleView}>
            <Eye className="mr-2 h-4 w-4" />
            Ver Consulta
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowArchiveDialog(true)}
            className="text-orange-600 focus:text-orange-600"
          >
            <Archive className="mr-2 h-4 w-4" />
            Archivar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar consulta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción archivará la consulta de{" "}
              <strong>{patientName}</strong>. La consulta no se eliminará
              permanentemente y podrá ser restaurada desde la sección de
              archivados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? "Archivando..." : "Archivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// "use client";

// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { DotIcon as DotsHorizontalIcon, Trash2 } from "lucide-react";
// import { useState } from "react";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";
// import { useConsultationOperations } from "@/hooks/use-consultation-operations";

// interface ConsultationActionsProps {
//   consultationId: string;
//   patientName: string;
//   onArchived?: (consultationId: string, patientName: string) => void;
// }

// export function ConsultationActions({
//   consultationId,
//   patientName,
//   onArchived,
// }: ConsultationActionsProps) {
//   const [showDeleteDialog, setShowDeleteDialog] = useState(false);
//   const [deleting, setDeleting] = useState(false);
//   const { archiveConsultation } = useConsultationOperations();

//   const handleArchive = async () => {
//     if (onArchived) {
//       await onArchived(consultationId, patientName);
//     }
//     setShowDeleteDialog(false);
//   };

//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <button className="p-2 hover:bg-secondary rounded-md">
//           <DotsHorizontalIcon className="w-4 h-4" />
//         </button>
//       </DropdownMenuTrigger>
//       <DropdownMenuContent align="end">
//         <DropdownMenuItem
//           onClick={() => setShowDeleteDialog(true)}
//           className="text-orange-600 focus:text-orange-600"
//         >
//           <Trash2 className="mr-2 h-4 w-4" />
//           Archivar
//         </DropdownMenuItem>
//       </DropdownMenuContent>

//       <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
//         <AlertDialogContent>
//           <AlertDialogTitle>¿Archivar consulta?</AlertDialogTitle>
//           <AlertDialogDescription>
//             Esta acción archivará la consulta de <strong>{patientName}</strong>.
//             La consulta no aparecerá en la lista principal pero se conservará en
//             el historial médico y podrá ser restaurada desde la sección de
//             archivados.
//           </AlertDialogDescription>
//           <AlertDialogAction
//             onClick={handleArchive}
//             disabled={deleting}
//             className="bg-orange-600 hover:bg-orange-700"
//           >
//             {deleting ? "Archivando..." : "Archivar"}
//           </AlertDialogAction>
//           <AlertDialogCancel>Cancelar</AlertDialogCancel>
//         </AlertDialogContent>
//       </AlertDialog>
//     </DropdownMenu>
//   );
// }

// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";
// import { MoreHorizontal, Edit, Archive, Eye, RotateCcw } from "lucide-react";
// import { useConsultationOperations } from "@/hooks/use-consultation-operations";

// interface ConsultationActionsProps {
//   consultationId: string;
//   patientName: string;
//   isArchived?: boolean;
//   onUpdated?: () => void;
// }

// export function ConsultationActions({
//   consultationId,
//   patientName,
//   isArchived = false,
//   onUpdated,
// }: ConsultationActionsProps) {
//   const router = useRouter();
//   const [showArchiveDialog, setShowArchiveDialog] = useState(false);
//   const [showRestoreDialog, setShowRestoreDialog] = useState(false);
//   const { loading, archiveConsultation, restoreConsultation } =
//     useConsultationOperations();

//   const handleView = () => {
//     router.push(`/dashboard/consultations/${consultationId}`);
//   };

//   const handleEdit = () => {
//     router.push(`/dashboard/consultations/${consultationId}/edit`);
//   };

//   const handleArchive = async () => {
//     const success = await archiveConsultation(consultationId, patientName);
//     if (success) {
//       setShowArchiveDialog(false);
//       if (onUpdated) onUpdated();
//     }
//   };

//   const handleRestore = async () => {
//     const success = await restoreConsultation(consultationId, patientName);
//     if (success) {
//       setShowRestoreDialog(false);
//       if (onUpdated) onUpdated();
//     }
//   };

//   return (
//     <>
//       <DropdownMenu>
//         <DropdownMenuTrigger asChild>
//           <Button variant="ghost" className="h-8 w-8 p-0">
//             <span className="sr-only">Abrir menú</span>
//             <MoreHorizontal className="h-4 w-4" />
//           </Button>
//         </DropdownMenuTrigger>
//         <DropdownMenuContent align="end">
//           <DropdownMenuItem onClick={handleView}>
//             <Eye className="mr-2 h-4 w-4" />
//             Ver Consulta
//           </DropdownMenuItem>

//           {!isArchived && (
//             <DropdownMenuItem onClick={handleEdit}>
//               <Edit className="mr-2 h-4 w-4" />
//               Editar
//             </DropdownMenuItem>
//           )}

//           <DropdownMenuSeparator />

//           {isArchived ? (
//             <DropdownMenuItem
//               onClick={() => setShowRestoreDialog(true)}
//               className="text-green-600 focus:text-green-600"
//             >
//               <RotateCcw className="mr-2 h-4 w-4" />
//               Restaurar
//             </DropdownMenuItem>
//           ) : (
//             <DropdownMenuItem
//               onClick={() => setShowArchiveDialog(true)}
//               className="text-orange-600 focus:text-orange-600"
//             >
//               <Archive className="mr-2 h-4 w-4" />
//               Archivar
//             </DropdownMenuItem>
//           )}
//         </DropdownMenuContent>
//       </DropdownMenu>

//       {/* Dialog de confirmación para archivar */}
//       <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>¿Archivar consulta?</AlertDialogTitle>
//             <AlertDialogDescription>
//               La consulta de <strong>{patientName}</strong> será archivada y no
//               aparecerá en la lista principal. Podrás restaurarla desde la
//               sección de archivados cuando sea necesario.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
//             <AlertDialogAction
//               onClick={handleArchive}
//               disabled={loading}
//               className="bg-orange-600 hover:bg-orange-700"
//             >
//               {loading ? "Archivando..." : "Archivar"}
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>

//       {/* Dialog de confirmación para restaurar */}
//       <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>¿Restaurar consulta?</AlertDialogTitle>
//             <AlertDialogDescription>
//               La consulta de <strong>{patientName}</strong> será restaurada y
//               volverá a aparecer en la lista principal.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
//             <AlertDialogAction
//               onClick={handleRestore}
//               disabled={loading}
//               className="bg-green-600 hover:bg-green-700"
//             >
//               {loading ? "Restaurando..." : "Restaurar"}
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </>
//   );
// }

// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";
// import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
// import { supabase } from "@/lib/supabase/supabase";
// import { useToastEnhanced } from "@/hooks/use-toast-enhanced";

// interface ConsultationActionsProps {
//   consultationId: string;
//   patientName: string;
//   onDeleted?: () => void;
// }

// export function ConsultationActions({
//   consultationId,
//   patientName,
//   onDeleted,
// }: ConsultationActionsProps) {
//   const router = useRouter();
//   const [showDeleteDialog, setShowDeleteDialog] = useState(false);
//   const [deleting, setDeleting] = useState(false);
//   const { showSuccess, showError } = useToastEnhanced();

//   const handleView = () => {
//     router.push(`/dashboard/consultations/${consultationId}`);
//   };

//   const handleEdit = () => {
//     router.push(`/dashboard/consultations/${consultationId}/edit`);
//   };

//   const handleDelete = async () => {
//     setDeleting(true);
//     try {
//       const { error } = await supabase
//         .from("consultations")
//         .delete()
//         .eq("id", consultationId);

//       if (error) throw error;

//       showSuccess(
//         "Consulta Eliminada",
//         `La consulta de ${patientName} ha sido eliminada exitosamente`
//       );
//       setShowDeleteDialog(false);

//       // Llamar callback si existe
//       if (onDeleted) {
//         onDeleted();
//       }
//     } catch (error: any) {
//       console.error("Error eliminando consulta:", error);
//       showError(
//         "Error al Eliminar",
//         error.message || "No se pudo eliminar la consulta"
//       );
//     } finally {
//       setDeleting(false);
//     }
//   };

//   return (
//     <>
//       <DropdownMenu>
//         <DropdownMenuTrigger asChild>
//           <Button variant="ghost" className="h-8 w-8 p-0">
//             <span className="sr-only">Abrir menú</span>
//             <MoreHorizontal className="h-4 w-4" />
//           </Button>
//         </DropdownMenuTrigger>
//         <DropdownMenuContent align="end">
//           <DropdownMenuItem onClick={handleView}>
//             <Eye className="mr-2 h-4 w-4" />
//             Ver Consulta
//           </DropdownMenuItem>
//           <DropdownMenuItem onClick={handleEdit}>
//             <Edit className="mr-2 h-4 w-4" />
//             Editar
//           </DropdownMenuItem>
//           <DropdownMenuSeparator />
//           <DropdownMenuItem
//             onClick={() => setShowDeleteDialog(true)}
//             className="text-red-600 focus:text-red-600"
//           >
//             <Trash2 className="mr-2 h-4 w-4" />
//             Eliminar
//           </DropdownMenuItem>
//         </DropdownMenuContent>
//       </DropdownMenu>

//       <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
//             <AlertDialogDescription>
//               Esta acción no se puede deshacer. Se eliminará permanentemente la
//               consulta de <strong>{patientName}</strong> y todos sus datos
//               asociados.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
//             <AlertDialogAction
//               onClick={handleDelete}
//               disabled={deleting}
//               className="bg-red-600 hover:bg-red-700"
//             >
//               {deleting ? "Eliminando..." : "Eliminar"}
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </>
//   );
// }
