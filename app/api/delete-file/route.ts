import { type NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function DELETE(request: NextRequest) {
  try {
    const { publicId } = await request.json()

    if (!publicId) {
      return NextResponse.json({ error: "No public ID provided" }, { status: 400 })
    }

    // Eliminar de Cloudinary
    const result = await cloudinary.uploader.destroy(publicId)

    return NextResponse.json({ result })
  } catch (error: any) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Delete failed: " + error.message }, { status: 500 })
  }
}
