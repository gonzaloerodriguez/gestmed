import { type NextRequest, NextResponse } from "next/server";
import { logAdminAction } from "@/lib/log-admin";


export async function POST(req: NextRequest) {
  try {
    const { adminId, action, details, userAgent } = await req.json();

    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    
    await logAdminAction({
      adminId,
      action,
      details,
       userAgent,
      ip,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging admin activity:", error);
    return NextResponse.json({ error: "Error logging admin activity" }, { status: 500 });
  }
}
