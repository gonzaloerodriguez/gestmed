"use client";

import type React from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { UserProvider } from "@/contexts/user-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <UserProvider>
        <DashboardSidebar>{children}</DashboardSidebar>
      </UserProvider>
    </>
  );
}
