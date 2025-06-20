import { createAdminClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// Solo accesible desde el backend
const supabase = createAdminClient();

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      userId,
      email,
      fullName,
      cedula,
      gender,
      licenseNumber,
      specialty,
      documentUrl,
    } = body

    const { error } = await supabase.from('doctors').insert({
      id: userId,
      email,
      full_name: fullName,
      cedula,
      gender,
      license_number: licenseNumber,
      specialty,
      document_url: documentUrl,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Doctor created' }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
