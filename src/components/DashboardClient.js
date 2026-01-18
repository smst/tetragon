"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

// Modular Components
import DashboardHeader from "@/components/DashboardHeader";
import IndividualGrading from "@/components/IndividualGrading";
import TeamGrading from "@/components/TeamGrading";
import DesignGrading from "@/components/DesignGrading";
import ProctorView from "@/components/ProctorView";
import Scoreboard from "@/components/Scoreboard";
import StaffManagement from "@/components/StaffManagement";

export default function DashboardClient({
    initialCompetitors,
    initialTeams,
    userEmail,
    userRole,
}) {
    const router = useRouter();

    // UI State
    const [activeTab, setActiveTab] = useState("math");
    const [loadingScore, setLoadingScore] = useState(false);

    // Data State (Pre-loaded from server, but updateable)
    const [competitors, setCompetitors] = useState(initialCompetitors);
    const [teams, setTeams] = useState(initialTeams);

    // Refresh Data after calculations
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

    const handleCalculate = async () => {
        setLoadingScore(true);
        try {
            // Get session for API authorization
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const res = await fetch("/api/calculate-scores", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session?.access_token}`,
                },
            });

            if (!res.ok) throw new Error("Calculation failed");
            await refreshData();
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setLoadingScore(false);
        }
    };

    const onLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
    };

    const isStaff = userRole === "admin" || userRole === "grader";

    return (
        <div className="bg-white pb-20">
            <DashboardHeader
                userEmail={userEmail}
                role={userRole}
                onLogout={onLogout}
            />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
                {/* --- TABS (Staff Only) --- */}
                {isStaff && (
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8">
                            {["math", "science", "team", "design"].map(
                                (tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`whitespace-nowrap py-2 px-3 border-b-2 font-medium text-md capitalize transition-colors cursor-pointer ${
                                            activeTab === tab
                                                ? "border-blue-500 text-blue-600"
                                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                ),
                            )}
                        </nav>
                    </div>
                )}

                {/* GRADING STATIONS */}
                {isStaff && (
                    <div className="bg-white shadow-lg border border-gray-300 rounded-2xl p-8">
                        {activeTab === "math" && (
                            <IndividualGrading
                                competitors={competitors}
                                roundType="math"
                                title="Math Individual Round"
                            />
                        )}
                        {activeTab === "science" && (
                            <IndividualGrading
                                competitors={competitors}
                                roundType="science"
                                title="Science Individual Round"
                            />
                        )}
                        {activeTab === "team" && <TeamGrading teams={teams} />}
                        {activeTab === "design" && (
                            <DesignGrading teams={teams} />
                        )}
                    </div>
                )}

                {/* PROCTOR VIEW */}
                {userRole === "proctor" && (
                    <ProctorView competitors={competitors} teams={teams} />
                )}

                {/* SCOREBOARD (Admin Only) */}
                {userRole === "admin" && (
                    <section className="pt-8">
                        <div className="bg-white shadow-lg border border-gray-300 rounded-2xl p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900">
                                    Scoreboard
                                </h2>
                                <button
                                    onClick={handleCalculate}
                                    disabled={loadingScore}
                                    className={`px-8 py-2.5 shadow-md shadow-blue-300 text-md font-medium text-white rounded-xl transition-all active:scale-95 ${
                                        loadingScore
                                            ? "bg-blue-400 cursor-not-allowed"
                                            : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                                    }`}
                                >
                                    {loadingScore
                                        ? "Running Algorithm..."
                                        : "Recalculate Scores"}
                                </button>
                            </div>
                            <Scoreboard
                                competitors={competitors}
                                teams={teams}
                            />
                        </div>
                    </section>
                )}

                {/* STAFF MANAGEMENT (Admin Only) */}
                {userRole === "admin" && (
                    <section className="pt-8">
                        <div className="bg-white shadow-lg border border-gray-300 rounded-2xl p-8">
                            <StaffManagement />
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
