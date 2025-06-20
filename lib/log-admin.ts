export const logAdminAction = async ({
  adminId,
  action,
  details,
}: {
  adminId: string;
  action: string;
  details: string;
}) => {
  const userAgent = navigator.userAgent;

  await fetch("/api/log-admin-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, action, details, userAgent }),
  });
};
