"use client";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useTournamentData } from "@/hooks/useTournamentData";
import { UserRole } from "@/types";
import { UserProvider } from "@/context/UserContext";

// Sub-Panels
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import SchedulePanel from "@/components/panels/SchedulePanel";
import GradingPanel from "@/components/panels/GradingPanel";
import ScoreboardPanel from "@/components/panels/ScoreboardPanel";
import StaffManagement from "@/components/panels/StaffManagementPanel";
import AttendancePanel from "@/components/panels/AttendancePanel";
import ProctorGuidePanel from "@/components/panels/ProctorGuidePanel";
import ConfigPanel from "@/components/panels/ConfigPanel";

interface DashboardClientProps {
    userEmail: string;
    userRole: UserRole;
}

export default function DashboardClient({
    userEmail,
    userRole,
}: DashboardClientProps) {
    const router = useRouter();
    const { isLoading, isError } = useTournamentData();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
    };

    if (isError)
        return (
            <div className="p-8 text-center text-red-500 mt-10 font-bold">
                Error loading tournament data. Check your connection.
            </div>
        );
    if (isLoading)
        return (
            <div className="p-8 text-center text-gray-500 animate-pulse mt-10">
                Syncing live tournament data...
            </div>
        );

    const renderAdminView = () => (
        <>
            <GradingPanel />
            <ScoreboardPanel />
            <AttendancePanel />
            <StaffManagement />
            <ConfigPanel />
        </>
    );

    const renderGraderView = () => (
        <>
            <GradingPanel />
        </>
    );

    const renderProctorView = () => (
        <>
            <AttendancePanel />
            <ProctorGuidePanel />
        </>
    );

    return (
        <UserProvider userEmail={userEmail} userRole={userRole}>
            <div className="bg-white pb-20 min-h-screen">
                <DashboardHeader
                    userEmail={userEmail}
                    role={userRole}
                    onLogout={handleLogout}
                />

                <main className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 mt-8">
                    {userRole === "unassigned" ? (
                        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200 max-w-2xl mx-auto mt-12">
                            Your account is pending role assignment. Please
                            contact an administrator.
                        </div>
                    ) : (
                        <div className="flex flex-col xl:flex-row gap-8 items-start">
                            {/* Left Sidebar - Schedule (Fixed sizing to prevent squeezing) */}
                            <div className="w-full xl:w-92 shrink-0 xl:sticky xl:top-24">
                                <SchedulePanel />
                            </div>

                            {/* Right Main Content */}
                            <div className="w-full flex-1 space-y-8 min-w-0">
                                {userRole === "admin" && renderAdminView()}
                                {userRole === "grader" && renderGraderView()}
                                {userRole === "proctor" && renderProctorView()}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </UserProvider>
    );
}
