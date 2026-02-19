"use client";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useTournamentData } from "@/hooks/useTournamentData";
import { UserRole } from "@/types";

// Sub-Panels
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import SchedulePanel from "@/components/panels/SchedulePanel";
import GradingPanel from "@/components/panels/GradingPanel";
import ScoreboardPanel from "@/components/panels/ScoreboardPanel";
import StaffManagement from "@/components/panels/StaffManagementPanel";
import AttendancePanel from "@/components/panels/AttendancePanel";
import ProctorGuidePanel from "@/components/panels/ProctorGuidePanel";

// Define the props this component expects
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
        <div className="space-y-8">
            <SchedulePanel />
            <GradingPanel />
            <ScoreboardPanel />
            <StaffManagement />
        </div>
    );

    const renderGraderView = () => (
        <div className="space-y-8">
            <SchedulePanel />
            <GradingPanel />
        </div>
    );

    const renderProctorView = () => (
        <div className="space-y-8">
            <SchedulePanel />
            <AttendancePanel />
            <ProctorGuidePanel />
        </div>
    );

    return (
        <div className="bg-white pb-20">
            <DashboardHeader
                userEmail={userEmail}
                role={userRole}
                onLogout={handleLogout}
            />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                {userRole === "admin" && renderAdminView()}
                {userRole === "grader" && renderGraderView()}
                {userRole === "proctor" && renderProctorView()}
                {userRole === "unassigned" && (
                    <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                        Your account is pending role assignment. Please contact
                        an administrator.
                    </div>
                )}
            </main>
        </div>
    );
}
