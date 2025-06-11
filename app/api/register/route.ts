// app/api/register/route.ts

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Solo accesible desde el backend
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
