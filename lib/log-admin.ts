import { createAdminClient } from "@/lib/supabase/supabase";

interface LogParams {
  adminId: string;
  action: string;
  details: string;
  userAgent?: string;
  ip?: string;
}


export const logAdminAction = async ({
  adminId,
  action,
  details, userAgent,
  ip,
}: LogParams) => {
  const supabase = createAdminClient();

 await supabase.from("admin_activity_logs").insert({
    admin_id: adminId,
    action,
    details,
    user_agent: userAgent ?? "unknown",
    ip_adress: ip ?? "unknown",
    created_at: new Date().toISOString(),
  });
};
