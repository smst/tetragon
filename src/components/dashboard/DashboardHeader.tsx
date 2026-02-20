"use client";
import { UserRole } from "@/types";

interface DashboardHeaderProps {
    userEmail: string;
    role: UserRole | string;
    onLogout: () => Promise<void>;
}

export default function DashboardHeader({
    userEmail,
    role,
    onLogout,
}: DashboardHeaderProps) {
    const roleStyles: Record<string, string> = {
        admin: "text-purple-700 bg-purple-50 border-purple-200",
        grader: "text-blue-700 bg-blue-50 border-blue-200",
        proctor: "text-green-700 bg-green-50 border-green-200",
        unassigned: "text-gray-500 bg-gray-50 border-gray-200",
    };

    const currentRoleStyle =
        roleStyles[role.toLowerCase()] ?? roleStyles.unassigned;

    return (
        <nav className="bg-white border-b border-gray-300 shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center gap-6">
                        <h1 className="text-xl font-sans font-bold text-gray-900">
                            SMST Dashboard
                        </h1>
                        <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${currentRoleStyle}`}
                        >
                            {role}
                        </span>
                    </div>

                    <div className="flex items-center gap-6">
                        <span className="text-sm text-gray-500 hidden md:block truncate max-w-54">
                            {userEmail}
                        </span>
                        <button
                            onClick={onLogout}
                            className="border border-red-300 px-4 py-1.5 rounded-lg shadow-md text-sm font-medium bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800 transition-all cursor-pointer active:scale-90"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
