export interface StorageInfo {
  bucket: string;
  path: string;
}

export function parseStorageUrl(urlOrPath: string): StorageInfo | null {
  if (!urlOrPath) return null;
  // If it's already a plain path assume default bucket
  if (!urlOrPath.startsWith('http')) {
    const clean = urlOrPath.replace(/^\/+/, '');
    return { bucket: 'payment-proofs', path: clean };
  }
  try {
    const url = new URL(urlOrPath);
    const prefix = '/storage/v1/object/public/';
    const idx = url.pathname.indexOf(prefix);
    if (idx === -1) return null;
    const rest = url.pathname.slice(idx + prefix.length);
    const [bucket, ...parts] = rest.split('/');
    if (!bucket || parts.length === 0) return null;
    return { bucket, path: parts.join('/') };
  } catch {
    return null;
  }
}

// // lib/utils/get-signed-url.ts

// function extractPathFromUrl(input: string): string {
//   // Si ya es un path relativo, devolverlo
//   if (!input.startsWith("http")) return input;

//   try {
//     const url = new URL(input);

//     // El path comienza después de "/object/public/" o "/object/sign/"
//     const match = url.pathname.match(/\/object\/(?:public|sign)\/([^?]+)/);
//     if (match && match[1]) {
//       return decodeURIComponent(match[1]);
//     }

//     console.warn("No se pudo extraer filePath de URL:", input);
//     return input; // fallback
//   } catch {
//     return input;
//   }
// }

// export async function getSignedUrl(filePathOrUrl: string): Promise<string | null> {
//   if (!filePathOrUrl) return null;

//   const cleanPath = extractPathFromUrl(filePathOrUrl);

//   console.log("Signed URL filePath enviado al API:", cleanPath);


//   try {
//     const response = await fetch("/api/get-signed-url", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ filePath: cleanPath }),
//     });

//     if (response.ok) {
//       const { signedUrl } = await response.json();
//       return signedUrl;
//     } else {
//       const error = await response.json();
//       console.error("Error from signed URL API:", error);
//       return null;
//     }
//   } catch (error) {
//     console.error("Error generating signed URL:", error);
//     return null;
//   }
// }
