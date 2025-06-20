"use client";

import type React from "react";
import { UserProvider } from "@/contexts/user-context";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <DashboardSidebar>{children}</DashboardSidebar>
    </UserProvider>
  );
}
