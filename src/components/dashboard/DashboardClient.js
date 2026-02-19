"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

// Sub-Panels
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import SchedulePanel from "@/components/panels/SchedulePanel";
import GradingPanel from "@/components/panels/GradingPanel";
import ScoreboardPanel from "@/components/panels/ScoreboardPanel";
import StaffManagement from "@/components/panels/StaffManagementPanel";
import AttendancePanel from "@/components/panels/AttendancePanel";
import ProctorGuide from "@/components/panels/ProctorGuidePanel";

export default function DashboardClient({
    initialCompetitors,
    initialTeams,
    userEmail,
    userRole,
}) {
    const router = useRouter();
    const [competitors, setCompetitors] = useState(initialCompetitors);
    const [teams, setTeams] = useState(initialTeams);

    const refreshData = async () => {
        const { data: compData } = await supabase
            .from("competitors")
            .select(`*, team:teams(id, name, room)`)
            .order("name");
        const { data: teamData } = await supabase
            .from("teams")
            .select("*")
            .order("name");

        if (compData) setCompetitors(compData);
        if (teamData) setTeams(teamData);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
    };

    const renderAdminView = () => (
        <div className="space-y-8">
            <SchedulePanel />
            <GradingPanel competitors={competitors} teams={teams} />
            <ScoreboardPanel
                competitors={competitors}
                teams={teams}
                refreshData={refreshData}
            />
            <StaffManagement />
        </div>
    );

    const renderGraderView = () => (
        <div className="space-y-8">
            <SchedulePanel />
            <GradingPanel competitors={competitors} teams={teams} />
        </div>
    );

    const renderProctorView = () => (
        <div className="space-y-8">
            <SchedulePanel />
            <AttendancePanel competitors={competitors} />
            <ProctorGuide />
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
