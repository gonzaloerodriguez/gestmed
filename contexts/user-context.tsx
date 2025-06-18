"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import type { Doctor, Admin } from "@/lib/supabase";

type User = Doctor | Admin;
type UserType = "doctor" | "admin";

interface UserContextType {
  user: User | null;
  userType: UserType | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  updateUserData: (updates: Partial<User>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
  initialUser?: User;
  initialUserType?: UserType;
}

export function UserProvider({
  children,
  initialUser,
  initialUserType,
}: UserProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [userType, setUserType] = useState<UserType | null>(
    initialUserType || null
  );
  const [loading, setLoading] = useState(!initialUser);

  const refreshUser = async () => {
    try {
      setLoading(true);
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setUser(null);
        setUserType(null);
        return;
      }

      // Try to get doctor first
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (doctorData) {
        setUser(doctorData as Doctor);
        setUserType("doctor");
        return;
      }

      // If not doctor, try admin
      const { data: adminData } = await supabase
        .from("admins")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (adminData) {
        setUser(adminData as Admin);
        setUserType("admin");
        return;
      }

      // If neither, clear state
      setUser(null);
      setUserType(null);
    } catch (error) {
      console.error("Error refreshing user:", error);
    } finally {
      setLoading(false);
    }
  };

  // Optimistic update - actualiza inmediatamente sin esperar DB
  const updateUserData = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  useEffect(() => {
    if (!initialUser) {
      refreshUser();
    }
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        userType,
        loading,
        refreshUser,
        updateUserData,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
