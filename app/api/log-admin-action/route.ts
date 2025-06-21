import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/supabase";

// Cliente admin para bypass de RLS
const supabaseAdmin = createAdminClient();

export async function POST(req: NextRequest) {
  try {
    const { adminId, action, details, userAgent } = await req.json();

    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    await supabaseAdmin.from("admin_activity_logs").insert({
      admin_id: adminId,
      action,
      details,
      ip_adress: ip,
      user_agent: userAgent || "unknown",
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging admin activity:", error);
    return NextResponse.json({ error: "Error logging admin activity" }, { status: 500 });
  }
}
