import { v2 as cloudinary } from "cloudinary"

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export { cloudinary }

// Función para subir archivos
export const uploadToCloudinary = async (file: File, folder: string, publicId?: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const base64 = reader.result as string

      cloudinary.uploader.upload(
        base64,
        {
          folder: `medical-app/${folder}`,
          public_id: publicId,
          overwrite: true,
          resource_type: "auto",
          transformation: [{ quality: "auto:good" }, { fetch_format: "auto" }],
        },
        (error, result) => {
          if (error) {
            reject(error)
          } else {
            resolve(result!.secure_url)
          }
        },
      )
    }

    reader.onerror = () => reject(new Error("Error reading file"))
    reader.readAsDataURL(file)
  })
}

// Función para eliminar archivos
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

// Función para extraer public_id de una URL de Cloudinary
export const getPublicIdFromUrl = (url: string): string => {
  const parts = url.split("/")
  const filename = parts[parts.length - 1]
  return filename.split(".")[0]
}
