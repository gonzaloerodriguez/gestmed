"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Upload,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
import type { SignatureUploadProps } from "@/lib/supabase/types/signatureupload";
import SignatureCanvas from "react-signature-canvas";

export function SignatureUpload({
  doctorId,
  currentSignatureUrl,
  onSuccess,
}: SignatureUploadProps) {
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(
    currentSignatureUrl
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState(150);
  const [rotation, setRotation] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { showSuccess, showError, showWarning } = useToastEnhanced();
  const signatureCanvasRef = useRef<SignatureCanvas>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleFileChange = (file: File | null) => {
    setError(null);
    setSignatureFile(file);
    setRotation(0);

    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith("image/")) {
        setError("Por favor selecciona una imagen");
        setSignatureFile(null);
        return;
      }

      // Validar tamaño (500KB máximo)
      if (file.size > 500 * 1024) {
        setError("La imagen es demasiado grande (máximo 500KB)");
        setSignatureFile(null);
        return;
      }

      // Mostrar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSignaturePreview(result);

        // Corregir orientación en el canvas
        setTimeout(() => {
          correctImageOrientation(result);
        }, 100);
      };
      reader.readAsDataURL(file);
    } else {
      setSignaturePreview(currentSignatureUrl);
    }
  };

  const correctImageOrientation = (dataUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const correctedDataUrl = canvas.toDataURL("image/png");
      setSignaturePreview(correctedDataUrl);

      canvas.toBlob((blob) => {
        if (blob) {
          const correctedFile = new File([blob], "signature.png", {
            type: "image/png",
          });
          setSignatureFile(correctedFile);
        }
      }, "image/png");
    };
    img.src = dataUrl;
  };

  const rotateImage = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);

    const canvas = canvasRef.current;
    if (!canvas || !signaturePreview) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      if (newRotation === 90 || newRotation === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((newRotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      const rotatedDataUrl = canvas.toDataURL("image/png");
      setSignaturePreview(rotatedDataUrl);

      canvas.toBlob((blob) => {
        if (blob) {
          const rotatedFile = new File([blob], "signature.png", {
            type: "image/png",
          });
          setSignatureFile(rotatedFile);
        }
      }, "image/png");
    };
    img.src = signaturePreview;
  };

  const refreshImage = () => {
    setRefreshKey((prev) => prev + 1);
    if (currentSignatureUrl) {
      const urlWithCacheBust = `${currentSignatureUrl.split("?")[0]}?v=${Date.now()}`;
      setSignaturePreview(urlWithCacheBust);
    }
  };

  const uploadSignature = async () => {
    if (!signatureFile || !doctorId) {
      showWarning(
        "Archivo requerido",
        "Por favor selecciona una imagen para subir"
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) throw new Error("Usuario no autenticado");

      const formData = new FormData();
      formData.append("file", signatureFile);
      formData.append("userId", user.id);

      const response = await fetch("/api/upload-signature", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al subir la firma");
      }

      const result = await response.json();

      const { error: updateError } = await supabase
        .from("doctors")
        .update({ signature_stamp_url: result.url })
        .eq("id", doctorId);

      if (updateError) throw updateError;

      showSuccess(
        "Firma actualizada",
        "Tu firma y sello han sido actualizados correctamente"
      );
      setSignatureFile(null);
      setRefreshKey((prev) => prev + 1);
      onSuccess();
    } catch (err: any) {
      showError(
        "Error subiendo firma",
        err.message || "Ha ocurrido un error inesperado"
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteSignature = async () => {
    if (!currentSignatureUrl || !doctorId) return;

    setSaving(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) throw new Error("Usuario no autenticado");

      const { data: existingFiles, error: listError } = await supabase.storage
        .from("signatures")
        .list(user.id, {
          limit: 100,
          offset: 0,
        });

      if (!listError && existingFiles) {
        const filesToDelete = existingFiles
          .filter((file) => file.name.startsWith("signature_"))
          .map((file) => `${user.id}/${file.name}`);

        if (filesToDelete.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from("signatures")
            .remove(filesToDelete);

          if (deleteError) throw deleteError;
        }
      }

      const { error: updateError } = await supabase
        .from("doctors")
        .update({ signature_stamp_url: null })
        .eq("id", doctorId);

      if (updateError) throw updateError;

      setSignaturePreview(null);
      setRefreshKey((prev) => prev + 1);
      showSuccess(
        "Firma eliminada",
        "Tu firma y sello han sido eliminados correctamente"
      );
      setShowDeleteDialog(false);
      onSuccess();
    } catch (err: any) {
      showError(
        "Error eliminando firma",
        err.message || "Ha ocurrido un error inesperado"
      );
    } finally {
      setSaving(false);
    }
  };
  const clearCanvas = () => {
    signatureCanvasRef.current?.clear();
  };

  const saveCanvasSignature = async () => {
    if (!signatureCanvasRef.current || signatureCanvasRef.current.isEmpty()) {
      showWarning("Firma vacía", "Por favor dibuja una firma primero");
      return;
    }

    setSaving(true);

    try {
      const dataUrl = signatureCanvasRef.current
        .getCanvas()
        .toDataURL("image/png");

      const res = await fetch(dataUrl);
      const blob = await res.blob();

      const file = new File([blob], "signature_canvas.png", {
        type: "image/png",
      });

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) throw new Error("Usuario no autenticado");

      const filePath = `${user.id}/signature_canvas_${Date.now()}.png`;

      const { data, error: uploadError } = await supabase.storage
        .from("signatures")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("signatures")
        .getPublicUrl(filePath);

      const signatureUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from("doctors")
        .update({ signature_stamp_url: signatureUrl })
        .eq("id", doctorId);

      if (updateError) throw updateError;

      showSuccess("Firma guardada", "Tu firma fue guardada desde el canvas");
      onSuccess();
    } catch (err: any) {
      showError("Error guardando firma", err.message || "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="h-5 w-5 mr-2" />
          Firma Digital
        </CardTitle>
        <CardDescription>
          Dibuja tu firma o sube una imagen PNG que contenga tanto tu firma como
          tu sello médico para usar en las recetas. Puede actualizarla cuando
          desees!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Canvas oculto para procesamiento de imágenes */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {signaturePreview && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-600">Firma actual:</p>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshImage}
                title="Refrescar imagen"
                disabled={saving}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-col items-center">
              <div className="bg-white p-4 border rounded mb-2">
                <img
                  key={refreshKey}
                  src={signaturePreview || "/placeholder.svg"}
                  alt="Firma y sello médico"
                  style={{
                    height: `${previewSize}px`,
                    transform: `rotate(${rotation}deg)`,
                  }}
                  className="object-contain"
                  onError={() => {
                    setError("Error cargando la imagen. Intenta refrescar.");
                  }}
                />
              </div>

              <div className="w-full max-w-xs">
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="size-range" className="text-xs text-gray-500">
                    Ajustar tamaño:
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={rotateImage}
                    title="Rotar imagen"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <ZoomOut className="h-4 w-4 text-gray-500" />
                  <input
                    id="size-range"
                    type="range"
                    min="50"
                    max="300"
                    step="10"
                    value={previewSize}
                    onChange={(e) => setPreviewSize(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <ZoomIn className="h-4 w-4 text-gray-500" />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {previewSize}px
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label>Dibuja tu firma aquí:</Label>
          <div className="border rounded p-2 bg-white">
            <SignatureCanvas
              penColor="black"
              backgroundColor="white"
              ref={signatureCanvasRef}
              canvasProps={{
                width: 400,
                height: 150,
                className: "border rounded",
              }}
              onBegin={() => setIsDrawing(true)}
              onEnd={() => setIsDrawing(false)}
            />
          </div>
          <div className="flex space-x-2 mt-2">
            <Button
              type="button"
              onClick={clearCanvas}
              variant="outline"
              disabled={saving}
            >
              Limpiar
            </Button>
            <Button
              type="button"
              onClick={saveCanvasSignature}
              disabled={saving || isDrawing}
            >
              Guardar Firma desde Canvas
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="signature_stamp">
            Sube una imagen con tu firma y sello
          </Label>
          <Input
            id="signature_stamp"
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
          />
          <div className="text-xs text-gray-500 mt-2">
            <p className="font-medium mb-1">
              Recomendaciones para mejores resultados:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Toma la foto con buena iluminación natural</li>
              <li>Usa un fondo blanco o claro uniforme</li>
              <li>
                Asegúrate de que haya buen contraste entre la firma/sello y el
                fondo
              </li>
              <li>Si la imagen aparece rotada, usa el botón de rotación</li>
              <li>Si no ves los cambios, usa el botón de refrescar</li>
              <li>
                La imagen será optimizada automáticamente (400x200px máximo)
              </li>
              <li>Tamaño máximo de archivo: 500KB</li>
            </ul>
          </div>

          {error && (
            <div className="flex items-center gap-1 text-destructive text-sm mt-2">
              <AlertCircle className="h-3 w-3" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={uploadSignature}
            disabled={!signatureFile || saving}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            {saving ? "Subiendo..." : "Subir Firma y Sello"}
          </Button>

          {currentSignatureUrl && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={saving}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          )}
        </div>

        {/* Dialog de confirmación para eliminar */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar firma y sello?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará tu firma y sello digital. Podrás subir uno
                nuevo en cualquier momento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteSignature}
                className="bg-red-600 hover:bg-red-700"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

// "use client";

// import { useState, useRef } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Upload,
//   Trash2,
//   ZoomIn,
//   ZoomOut,
//   RotateCcw,
//   RefreshCw,
// } from "lucide-react";
// import { supabase } from "@/lib/supabase/supabase";
// import type { SignatureUploadProps } from "@/lib/supabase/types/signatureupload";

// export function SignatureUpload({
//   doctorId,
//   currentSignatureUrl,
//   onSuccess,
// }: SignatureUploadProps) {
//   const [signatureFile, setSignatureFile] = useState<File | null>(null);
//   const [signaturePreview, setSignaturePreview] = useState<string | null>(
//     currentSignatureUrl
//   );
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [previewSize, setPreviewSize] = useState(150);
//   const [rotation, setRotation] = useState(0);
//   const [refreshKey, setRefreshKey] = useState(0);
//   const canvasRef = useRef<HTMLCanvasElement>(null);

//   const handleFileChange = (file: File | null) => {
//     setError(null);
//     setSignatureFile(file);
//     setRotation(0);

//     if (file) {
//       // Validar tipo de archivo
//       if (!file.type.startsWith("image/")) {
//         setError("Por favor selecciona una imagen");
//         setSignatureFile(null);
//         return;
//       }

//       // Validar tamaño (500KB máximo)
//       if (file.size > 500 * 1024) {
//         setError("La imagen es demasiado grande (máximo 500KB)");
//         setSignatureFile(null);
//         return;
//       }

//       // Mostrar preview
//       const reader = new FileReader();
//       reader.onload = (e) => {
//         const result = e.target?.result as string;
//         setSignaturePreview(result);

//         // Corregir orientación en el canvas
//         setTimeout(() => {
//           correctImageOrientation(result);
//         }, 100);
//       };
//       reader.readAsDataURL(file);
//     } else {
//       setSignaturePreview(currentSignatureUrl);
//     }
//   };

//   const correctImageOrientation = (dataUrl: string) => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;

//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     const img = new Image();
//     img.onload = () => {
//       // Ajusta el tamaño del canvas
//       canvas.width = img.width;
//       canvas.height = img.height;

//       // Limpia el canvas
//       ctx.clearRect(0, 0, canvas.width, canvas.height);

//       // Dibuja la imagen
//       ctx.drawImage(img, 0, 0);

//       // Obtiene la imagen corregida
//       const correctedDataUrl = canvas.toDataURL("image/png");
//       setSignaturePreview(correctedDataUrl);

//       // Convertir a Blob y luego a File para subir
//       canvas.toBlob((blob) => {
//         if (blob) {
//           const correctedFile = new File([blob], "signature.png", {
//             type: "image/png",
//           });
//           setSignatureFile(correctedFile);
//         }
//       }, "image/png");
//     };
//     img.src = dataUrl;
//   };

//   // Función para rotar la imagen manualmente
//   const rotateImage = () => {
//     const newRotation = (rotation + 90) % 360;
//     setRotation(newRotation);

//     const canvas = canvasRef.current;
//     if (!canvas || !signaturePreview) return;

//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     const img = new Image();
//     img.onload = () => {
//       // Ajustar tamaño del canvas según la rotación
//       if (newRotation === 90 || newRotation === 270) {
//         canvas.width = img.height;
//         canvas.height = img.width;
//       } else {
//         canvas.width = img.width;
//         canvas.height = img.height;
//       }

//       // Limpiar canvas
//       ctx.clearRect(0, 0, canvas.width, canvas.height);

//       // Transformar y dibujar
//       ctx.save();
//       ctx.translate(canvas.width / 2, canvas.height / 2);
//       ctx.rotate((newRotation * Math.PI) / 180);
//       ctx.drawImage(img, -img.width / 2, -img.height / 2);
//       ctx.restore();

//       // Obtener imagen rotada
//       const rotatedDataUrl = canvas.toDataURL("image/png");
//       setSignaturePreview(rotatedDataUrl);

//       // Convertir a Blob y luego a File para subir
//       canvas.toBlob((blob) => {
//         if (blob) {
//           const rotatedFile = new File([blob], "signature.png", {
//             type: "image/png",
//           });
//           setSignatureFile(rotatedFile);
//         }
//       }, "image/png");
//     };
//     img.src = signaturePreview;
//   };

//   // Función para refrescar la imagen (forzar recarga desde servidor)
//   const refreshImage = () => {
//     setRefreshKey((prev) => prev + 1);
//     // Recargar la imagen actual con cache-busting
//     if (currentSignatureUrl) {
//       const urlWithCacheBust = `${
//         currentSignatureUrl.split("?")[0]
//       }?v=${Date.now()}`;
//       setSignaturePreview(urlWithCacheBust);
//     }
//   };

//   const uploadSignature = async () => {
//     if (!signatureFile || !doctorId) return;

//     setSaving(true);
//     setError(null);

//     try {
//       // Obtener el usuario autenticado
//       const {
//         data: { user },
//         error: userError,
//       } = await supabase.auth.getUser();

//       if (userError || !user) throw new Error("Usuario no autenticado");

//       // Preparar FormData para la subida
//       const formData = new FormData();
//       formData.append("file", signatureFile);
//       formData.append("userId", user.id);

//       const response = await fetch("/api/upload-signature", {
//         method: "POST",
//         body: formData,
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.error || "Error al subir la firma");
//       }

//       const result = await response.json();

//       // Actualizar la base de datos con la nueva URL
//       const { error: updateError } = await supabase
//         .from("doctors")
//         .update({ signature_stamp_url: result.url })
//         .eq("id", doctorId);

//       if (updateError) throw updateError;

//       // Mostrar mensaje de éxito
//       alert("Firma y sello actualizados correctamente");
//       setSignatureFile(null);

//       // Forzar actualización de la imagen
//       setRefreshKey((prev) => prev + 1);

//       onSuccess();
//     } catch (err: any) {
//       setError(err.message || "Error al subir la firma");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const deleteSignature = async () => {
//     if (!currentSignatureUrl || !doctorId) return;

//     const confirmDelete = confirm(
//       "¿Estás seguro de que quieres eliminar tu firma y sello?"
//     );
//     if (!confirmDelete) return;

//     setSaving(true);

//     try {
//       // Obtener el usuario autenticado
//       const {
//         data: { user },
//         error: userError,
//       } = await supabase.auth.getUser();

//       if (userError || !user) throw new Error("Usuario no autenticado");

//       // Eliminar TODOS los archivos de firma del usuario
//       const { data: existingFiles, error: listError } = await supabase.storage
//         .from("signatures")
//         .list(user.id, {
//           limit: 100,
//           offset: 0,
//         });

//       if (!listError && existingFiles) {
//         const filesToDelete = existingFiles
//           .filter((file) => file.name.startsWith("signature_"))
//           .map((file) => `${user.id}/${file.name}`);

//         if (filesToDelete.length > 0) {
//           const { error: deleteError } = await supabase.storage
//             .from("signatures")
//             .remove(filesToDelete);

//           if (deleteError) throw deleteError;
//         }
//       }

//       // Actualizar base de datos
//       const { error: updateError } = await supabase
//         .from("doctors")
//         .update({ signature_stamp_url: null })
//         .eq("id", doctorId);

//       if (updateError) throw updateError;

//       // Actualizar UI
//       setSignaturePreview(null);
//       setRefreshKey((prev) => prev + 1);
//       alert("Firma y sello eliminados correctamente");
//       onSuccess();
//     } catch (err: any) {
//       setError(err.message || "Error al eliminar la firma");
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <div className="space-y-6">
//       {/* Canvas oculto para procesamiento de imágenes */}
//       <canvas ref={canvasRef} style={{ display: "none" }} />

//       {signaturePreview && (
//         <div className="border rounded-lg p-4 bg-gray-50">
//           <div className="flex justify-between items-center mb-2">
//             <p className="text-sm text-gray-600">Firma y sello actual:</p>
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={refreshImage}
//               title="Refrescar imagen"
//               disabled={saving}
//             >
//               <RefreshCw className="h-4 w-4" />
//             </Button>
//           </div>

//           <div className="flex flex-col items-center">
//             <div className="bg-white p-4 border rounded mb-2">
//               <img
//                 key={refreshKey} // Fuerza recarga cuando cambia
//                 src={signaturePreview || "/placeholder.svg"}
//                 alt="Firma y sello médico"
//                 style={{
//                   height: `${previewSize}px`,
//                   transform: `rotate(${rotation}deg)`,
//                 }}
//                 className="object-contain"
//                 onError={() => {
//                   console.error("Error cargando imagen");
//                   setError("Error cargando la imagen. Intenta refrescar.");
//                 }}
//               />
//             </div>

//             {/* Control de tamaño y rotación */}
//             <div className="w-full max-w-xs">
//               <div className="flex justify-between items-center mb-2">
//                 <Label htmlFor="size-range" className="text-xs text-gray-500">
//                   Ajustar tamaño:
//                 </Label>
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   onClick={rotateImage}
//                   title="Rotar imagen"
//                 >
//                   <RotateCcw className="h-4 w-4" />
//                 </Button>
//               </div>

//               <div className="flex items-center space-x-2">
//                 <ZoomOut className="h-4 w-4 text-gray-500" />
//                 <input
//                   id="size-range"
//                   type="range"
//                   min="50"
//                   max="300"
//                   step="10"
//                   value={previewSize}
//                   onChange={(e) => setPreviewSize(Number(e.target.value))}
//                   className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
//                 />
//                 <ZoomIn className="h-4 w-4 text-gray-500" />
//               </div>
//               <p className="text-xs text-gray-500 mt-1 text-center">
//                 {previewSize}px
//               </p>
//             </div>
//           </div>
//         </div>
//       )}

//       <div>
//         <Label htmlFor="signature_stamp">Nueva Firma y Sello</Label>
//         <Input
//           id="signature_stamp"
//           type="file"
//           accept="image/png,image/jpeg,image/jpg"
//           onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
//         />
//         <div className="text-xs text-gray-500 mt-2">
//           <p className="font-medium mb-1">
//             Recomendaciones para mejores resultados:
//           </p>
//           <ul className="list-disc pl-5 space-y-1">
//             <li>Toma la foto con buena iluminación natural</li>
//             <li>Usa un fondo blanco o claro uniforme</li>
//             <li>
//               Asegúrate de que haya buen contraste entre la firma/sello y el
//               fondo
//             </li>
//             <li>Si la imagen aparece rotada, usa el botón de rotación</li>
//             <li>Si no ves los cambios, usa el botón de refrescar</li>
//             <li>
//               La imagen será optimizada automáticamente (400x200px máximo)
//             </li>
//             <li>Tamaño máximo de archivo: 500KB</li>
//           </ul>
//         </div>

//         {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
//       </div>

//       <div className="flex space-x-2">
//         <Button
//           onClick={uploadSignature}
//           disabled={!signatureFile || saving}
//           className="flex-1"
//         >
//           <Upload className="h-4 w-4 mr-2" />
//           {saving ? "Subiendo..." : "Subir Firma y Sello"}
//         </Button>

//         {currentSignatureUrl && (
//           <Button
//             variant="destructive"
//             onClick={deleteSignature}
//             disabled={saving}
//           >
//             <Trash2 className="h-4 w-4 mr-2" />
//             Eliminar
//           </Button>
//         )}
//       </div>
//     </div>
//   );
// }
