"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Upload, Trash2, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
import type { Doctor } from "@/lib/supabase/types/doctor";

interface DocumentsTabProps {
  doctor: Doctor;
  onSuccess: () => void;
}

export function DocumentsTab({ doctor, onSuccess }: DocumentsTabProps) {
  const [saving, setSaving] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { showSuccess, showError, showWarning } = useToastEnhanced();

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setDocumentFile(null);
      return;
    }

    // Validar tipo de archivo
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    if (!allowedTypes.includes(file.type)) {
      showError(
        "Tipo de archivo no válido",
        "Solo se permiten archivos PDF, JPG o PNG"
      );
      return;
    }

    // Validar tamaño (10MB máximo)
    if (file.size > 10 * 1024 * 1024) {
      showError("Archivo muy grande", "El archivo no puede superar los 10MB");
      return;
    }

    setDocumentFile(file);
  };

  const uploadFile = async (
    file: File,
    folder: string,
    userId: string
  ): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    formData.append("userId", userId);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error al subir archivo");
    }

    const result = await response.json();
    return result.url;
  };

  const saveDocument = async () => {
    if (!documentFile) {
      showWarning(
        "Archivo requerido",
        "Por favor selecciona un archivo para subir"
      );
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) throw new Error("Usuario no autenticado");

      const documentUrl = await uploadFile(documentFile, user.id, user.id);

      const { error: updateError } = await supabase
        .from("doctors")
        .update({ document_url: documentUrl })
        .eq("id", doctor.id);

      if (updateError) throw updateError;

      showSuccess(
        "Documento subido",
        "Tu documento ha sido actualizado correctamente"
      );
      onSuccess();
      setDocumentFile(null);
    } catch (error: any) {
      showError(
        "Error subiendo documento",
        error.message || "Ha ocurrido un error inesperado"
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteDocument = async () => {
    if (!doctor.document_url) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("doctors")
        .update({ document_url: null })
        .eq("id", doctor.id);

      if (error) throw error;

      showSuccess(
        "Documento eliminado",
        "Tu documento ha sido eliminado correctamente"
      );
      onSuccess();
      setShowDeleteDialog(false);
    } catch (error: any) {
      showError(
        "Error eliminando documento",
        error.message || "Ha ocurrido un error inesperado"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Documentos de Credencial
        </CardTitle>
        <CardDescription>
          Gestiona tus documentos de credencial médica
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {doctor.document_url && (
          <div className="border rounded-lg p-4 bg-background">
            <p className="text-sm text-gray-600 mb-2">Documento actual:</p>
            <div className="flex items-center justify-between">
              <span className="text-sm">Documento de credencial</span>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(doctor.document_url!, "_blank")}
                >
                  Ver
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="document">Nuevo Documento (PDF recomendado)</Label>
          <Input
            id="document"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
          />
          <div className="text-xs text-gray-500 mt-2">
            <p className="font-medium mb-1">Formatos aceptados:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>PDF (recomendado para documentos oficiales)</li>
              <li>JPG, PNG (para imágenes escaneadas)</li>
              <li>Tamaño máximo: 10MB</li>
              <li>Asegúrate de que el documento sea legible</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={saveDocument} disabled={!documentFile || saving}>
            <Upload className="h-4 w-4 mr-2" />
            {saving ? "Subiendo..." : "Subir Documento"}
          </Button>
        </div>
      </CardContent>

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará tu documento de credencial. Podrás subir uno
              nuevo en cualquier momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteDocument}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
