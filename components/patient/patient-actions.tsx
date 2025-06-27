"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  Archive,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePatientOperations } from "@/hooks/use-patient-operations";
import type { Patient } from "@/lib/supabase/types/patient";

interface PatientActionsProps {
  patient: Patient;
  onPatientUpdated?: () => void;
  showViewButton?: boolean;
  showEditButton?: boolean;
  showDuplicateButton?: boolean;
  showArchiveButton?: boolean;
  showRestoreButton?: boolean;
  isArchived?: boolean;
}

export function PatientActions({
  patient,
  onPatientUpdated,
  showViewButton = true,
  showEditButton = true,
  showDuplicateButton = true,
  showArchiveButton = true,
  showRestoreButton = false,
  isArchived = false,
}: PatientActionsProps) {
  const router = useRouter();
  const { archivePatient, restorePatient, duplicatePatient, loading } =
    usePatientOperations();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  const handleView = () => {
    router.push(`/dashboard/patients/${patient.id}`);
  };

  const handleEdit = () => {
    router.push(`/dashboard/patients/${patient.id}/edit`);
  };

  const handleDuplicate = async () => {
    const success = await duplicatePatient(patient);
    if (success && onPatientUpdated) {
      onPatientUpdated();
    }
  };

  const handleArchive = async () => {
    const success = await archivePatient(patient);
    if (success && onPatientUpdated) {
      onPatientUpdated();
    }
    setShowArchiveDialog(false);
  };

  const handleRestore = async () => {
    const success = await restorePatient(patient);
    if (success && onPatientUpdated) {
      onPatientUpdated();
    }
    setShowRestoreDialog(false);
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
          {showViewButton && (
            <DropdownMenuItem onClick={handleView}>
              <Eye className="mr-2 h-4 w-4" />
              Ver detalles
            </DropdownMenuItem>
          )}
          {showEditButton && !isArchived && (
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
          )}
          {showDuplicateButton && (
            <DropdownMenuItem onClick={handleDuplicate} disabled={loading}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicar
            </DropdownMenuItem>
          )}
          {showRestoreButton && isArchived && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowRestoreDialog(true)}
                className="text-green-600 focus:text-green-600"
                disabled={loading}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restaurar
              </DropdownMenuItem>
            </>
          )}
          {showArchiveButton && !isArchived && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowArchiveDialog(true)}
                className="text-orange-600 focus:text-orange-600"
                disabled={loading}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archivar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de confirmación para archivar */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <Archive className="h-5 w-5 text-orange-500 mr-2" />
              ¿Archivar paciente?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Estás a punto de archivar a <strong>{patient.full_name}</strong>{" "}
                y toda su historia clínica.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-800 mb-1">
                  ℹ️ Información:
                </p>
                <ul className="text-blue-700 space-y-1">
                  <li>• El paciente y todos sus datos serán archivados</li>
                  <li>
                    • Se incluyen: consultas, prescripciones y representantes
                  </li>
                  <li>• Los datos se conservan por motivos legales</li>
                  <li>• Podrás restaurar el paciente cuando sea necesario</li>
                </ul>
              </div>
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

      {/* Dialog de confirmación para restaurar */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <RotateCcw className="h-5 w-5 text-green-500 mr-2" />
              ¿Restaurar paciente?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Estás a punto de restaurar a{" "}
                <strong>{patient.full_name}</strong> y toda su historia clínica.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-green-800 mb-1">
                  ✅ Restauración:
                </p>
                <ul className="text-green-700 space-y-1">
                  <li>• El paciente volverá a estar activo</li>
                  <li>• Se restaurarán todas las consultas y prescripciones</li>
                  <li>• Los representantes también serán reactivados</li>
                  <li>• Podrás continuar con la atención médica normal</li>
                </ul>
              </div>
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

// "use client";

// import { useState } from "react";
// import { Button } from "@/components/ui/button";
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
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import {
//   MoreHorizontal,
//   Eye,
//   Edit,
//   Copy,
//   Archive,
//   RotateCcw,
// } from "lucide-react";
// import { useRouter } from "next/navigation";
// import { usePatientOperations } from "@/hooks/use-patient-operations";
// import type { Patient } from "@/lib/supabase/types/patient";

// interface PatientActionsProps {
//   patient: Patient;
//   onPatientUpdated?: () => void;
//   showViewButton?: boolean;
//   showEditButton?: boolean;
//   showDuplicateButton?: boolean;
//   showArchiveButton?: boolean;
//   showRestoreButton?: boolean;
//   isArchived?: boolean;
// }

// export function PatientActions({
//   patient,
//   onPatientUpdated,
//   showViewButton = true,
//   showEditButton = true,
//   showDuplicateButton = true,
//   showArchiveButton = true,
//   showRestoreButton = false,
//   isArchived = false,
// }: PatientActionsProps) {
//   const router = useRouter();
//   const { archivePatient, restorePatient, duplicatePatient, loading } =
//     usePatientOperations();
//   const [showArchiveDialog, setShowArchiveDialog] = useState(false);
//   const [showRestoreDialog, setShowRestoreDialog] = useState(false);

//   const handleView = () => {
//     router.push(`/dashboard/patients/${patient.id}`);
//   };

//   const handleEdit = () => {
//     router.push(`/dashboard/patients/${patient.id}/edit`);
//   };

//   const handleDuplicate = async () => {
//     const success = await duplicatePatient(patient);
//     if (success && onPatientUpdated) {
//       onPatientUpdated();
//     }
//   };

//   const handleArchive = async () => {
//     const success = await archivePatient(patient);
//     if (success && onPatientUpdated) {
//       onPatientUpdated();
//     }
//     setShowArchiveDialog(false);
//   };

//   const handleRestore = async () => {
//     const success = await restorePatient(patient);
//     if (success && onPatientUpdated) {
//       onPatientUpdated();
//     }
//     setShowRestoreDialog(false);
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
//           {showViewButton && (
//             <DropdownMenuItem onClick={handleView}>
//               <Eye className="mr-2 h-4 w-4" />
//               Ver detalles
//             </DropdownMenuItem>
//           )}
//           {showEditButton && !isArchived && (
//             <DropdownMenuItem onClick={handleEdit}>
//               <Edit className="mr-2 h-4 w-4" />
//               Editar
//             </DropdownMenuItem>
//           )}
//           {showDuplicateButton && (
//             <DropdownMenuItem onClick={handleDuplicate} disabled={loading}>
//               <Copy className="mr-2 h-4 w-4" />
//               Duplicar
//             </DropdownMenuItem>
//           )}
//           {showRestoreButton && isArchived && (
//             <>
//               <DropdownMenuSeparator />
//               <DropdownMenuItem
//                 onClick={() => setShowRestoreDialog(true)}
//                 className="text-green-600 focus:text-green-600"
//                 disabled={loading}
//               >
//                 <RotateCcw className="mr-2 h-4 w-4" />
//                 Restaurar
//               </DropdownMenuItem>
//             </>
//           )}
//           {showArchiveButton && !isArchived && (
//             <>
//               <DropdownMenuSeparator />
//               <DropdownMenuItem
//                 onClick={() => setShowArchiveDialog(true)}
//                 className="text-orange-600 focus:text-orange-600"
//                 disabled={loading}
//               >
//                 <Archive className="mr-2 h-4 w-4" />
//                 Archivar
//               </DropdownMenuItem>
//             </>
//           )}
//         </DropdownMenuContent>
//       </DropdownMenu>

//       {/* Dialog de confirmación para archivar */}
//       <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle className="flex items-center">
//               <Archive className="h-5 w-5 text-orange-500 mr-2" />
//               ¿Archivar paciente?
//             </AlertDialogTitle>
//             <AlertDialogDescription className="space-y-2">
//               <p>
//                 Estás a punto de archivar a <strong>{patient.full_name}</strong>{" "}
//                 y toda su historia clínica.
//               </p>
//               <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
//                 <p className="font-medium text-blue-800 mb-1">
//                   ℹ️ Información:
//                 </p>
//                 <ul className="text-blue-700 space-y-1">
//                   <li>• El paciente y todos sus datos serán archivados</li>
//                   <li>
//                     • Se incluyen: consultas, prescripciones y representantes
//                   </li>
//                   <li>• Los datos se conservan por motivos legales</li>
//                   <li>• Podrás restaurar el paciente cuando sea necesario</li>
//                 </ul>
//               </div>
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
//             <AlertDialogTitle className="flex items-center">
//               <RotateCcw className="h-5 w-5 text-green-500 mr-2" />
//               ¿Restaurar paciente?
//             </AlertDialogTitle>
//             <AlertDialogDescription className="space-y-2">
//               <p>
//                 Estás a punto de restaurar a{" "}
//                 <strong>{patient.full_name}</strong> y toda su historia clínica.
//               </p>
//               <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
//                 <p className="font-medium text-green-800 mb-1">
//                   ✅ Restauración:
//                 </p>
//                 <ul className="text-green-700 space-y-1">
//                   <li>• El paciente volverá a estar activo</li>
//                   <li>• Se restaurarán todas las consultas y prescripciones</li>
//                   <li>• Los representantes también serán reactivados</li>
//                   <li>• Podrás continuar con la atención médica normal</li>
//                 </ul>
//               </div>
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
// import { Button } from "@/components/ui/button";
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
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import {
//   MoreHorizontal,
//   Eye,
//   Edit,
//   Copy,
//   Trash2,
//   AlertTriangle,
// } from "lucide-react";
// import { useRouter } from "next/navigation";
// import { usePatientOperations } from "@/hooks/use-patient-operations";
// import type { Patient } from "@/lib/supabase/types/patient";

// interface PatientActionsProps {
//   patient: Patient;
//   onPatientUpdated?: () => void;
//   showViewButton?: boolean;
//   showEditButton?: boolean;
//   showDuplicateButton?: boolean;
//   showDeleteButton?: boolean;
// }

// export function PatientActions({
//   patient,
//   onPatientUpdated,
//   showViewButton = true,
//   showEditButton = true,
//   showDuplicateButton = true,
//   showDeleteButton = true,
// }: PatientActionsProps) {
//   const router = useRouter();
//   const { deletePatient, duplicatePatient, loading } = usePatientOperations();
//   const [showDeleteDialog, setShowDeleteDialog] = useState(false);

//   const handleView = () => {
//     router.push(`/dashboard/patients/${patient.id}`);
//   };

//   const handleEdit = () => {
//     router.push(`/dashboard/patients/${patient.id}/edit`);
//   };

//   const handleDuplicate = async () => {
//     const success = await duplicatePatient(patient);
//     if (success && onPatientUpdated) {
//       onPatientUpdated();
//     }
//   };

//   const handleDelete = async () => {
//     const success = await deletePatient(patient);
//     if (success && onPatientUpdated) {
//       onPatientUpdated();
//     }
//     setShowDeleteDialog(false);
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
//           {showViewButton && (
//             <DropdownMenuItem onClick={handleView}>
//               <Eye className="mr-2 h-4 w-4" />
//               Ver detalles
//             </DropdownMenuItem>
//           )}
//           {showEditButton && (
//             <DropdownMenuItem onClick={handleEdit}>
//               <Edit className="mr-2 h-4 w-4" />
//               Editar
//             </DropdownMenuItem>
//           )}
//           {showDuplicateButton && (
//             <DropdownMenuItem onClick={handleDuplicate} disabled={loading}>
//               <Copy className="mr-2 h-4 w-4" />
//               Duplicar
//             </DropdownMenuItem>
//           )}
//           {showDeleteButton && (
//             <>
//               <DropdownMenuSeparator />
//               <DropdownMenuItem
//                 onClick={() => setShowDeleteDialog(true)}
//                 className="text-red-600 focus:text-red-600"
//                 disabled={loading}
//               >
//                 <Trash2 className="mr-2 h-4 w-4" />
//                 Eliminar
//               </DropdownMenuItem>
//             </>
//           )}
//         </DropdownMenuContent>
//       </DropdownMenu>

//       <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle className="flex items-center">
//               <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
//               ¿Eliminar paciente?
//             </AlertDialogTitle>
//             <AlertDialogDescription className="space-y-2">
//               <p>
//                 Estás a punto de eliminar a <strong>{patient.full_name}</strong>
//                 .
//               </p>
//               <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
//                 <p className="font-medium text-yellow-800 mb-1">
//                   ⚠️ Importante:
//                 </p>
//                 <ul className="text-yellow-700 space-y-1">
//                   <li>
//                     • Si tiene historial médico, será desactivado (no eliminado)
//                   </li>
//                   <li>
//                     • Si no tiene historial, será eliminado permanentemente
//                   </li>
//                   <li>• Esta acción no se puede deshacer</li>
//                 </ul>
//               </div>
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
//             <AlertDialogAction
//               onClick={handleDelete}
//               disabled={loading}
//               className="bg-red-600 hover:bg-red-700"
//             >
//               {loading ? "Eliminando..." : "Eliminar"}
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </>
//   );
// }
