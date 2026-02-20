"use client";
import { createContext, useContext } from "react";
import { UserRole } from "@/types";

interface UserContextValue {
    userEmail: string;
    userRole: UserRole;
}

const UserContext = createContext<UserContextValue>({
    userEmail: "",
    userRole: "unassigned",
});

export function UserProvider({
    userEmail,
    userRole,
    children,
}: UserContextValue & { children: React.ReactNode }) {
    return (
        <UserContext.Provider value={{ userEmail, userRole }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser(): UserContextValue {
    return useContext(UserContext);
}
