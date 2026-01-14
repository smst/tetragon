"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

// Modular Components
import DashboardHeader from "@/components/DashboardHeader";
import IndividualGrading from "@/components/IndividualGrading";
import TeamGrading from "@/components/TeamGrading";
import DesignGrading from "@/components/DesignGrading";
import ProctorView from "@/components/ProctorView";
import Scoreboard from "@/components/Scoreboard";

export default function Home() {
    const router = useRouter();

    // --- STATE ---
    const [session, setSession] = useState(null);
    const [role, setRole] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    // Data State
    const [competitors, setCompetitors] = useState([]);
    const [teams, setTeams] = useState([]);

    // UI State
    const [activeTab, setActiveTab] = useState("math"); // 'math', 'science', 'team', 'design'
    const [loadingScore, setLoadingScore] = useState(false);

    // --- 1. AUTH & INIT ---
    useEffect(() => {
        const init = async () => {
            const {
                data: { session: currentSession },
            } = await supabase.auth.getSession();
            if (!currentSession) {
                router.push("/login");
                return;
            }
            setSession(currentSession);

            // Get Role
            const { data: roleData } = await supabase
                .from("user_roles")
                .select("role")
                .eq("id", currentSession.user.id)
                .single();

            setRole(roleData?.role || "unassigned");

            // Load Data
            await fetchData();
            setLoadingAuth(false);
        };
        init();
    }, [router]);

    // --- 2. DATA FETCHING ---
    const fetchData = async () => {
        // Fetch Competitors (with their team_id)
        const { data: compData } = await supabase
            .from("competitors")
            .select("*")
            .order("name");
        if (compData) setCompetitors(compData);

        // Fetch Teams
        const { data: teamData } = await supabase
            .from("teams")
            .select("*")
            .order("name");
        if (teamData) setTeams(teamData);
    };

    // --- 3. SCORING TRIGGER ---
    const handleCalculate = async () => {
        setLoadingScore(true);
        try {
            const res = await fetch("/api/calculate-scores", {
                method: "POST",
            });
            if (!res.ok) throw new Error("Calculation failed");
            await fetchData();
            alert("All scores recalculated successfully!");
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setLoadingScore(false);
        }
    };

    if (loadingAuth)
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                Loading...
            </div>
        );

    const isStaff = role === "admin" || role === "grader";

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <DashboardHeader userEmail={session.user.email} role={role} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
                {/* --- TABS (Staff Only) --- */}
                {isStaff && (
                    <div className="border-b border-gray-200">
                        <nav
                            className="-mb-px flex space-x-8"
                            aria-label="Tabs"
                        >
                            {["math", "science", "team", "design"].map(
                                (tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors cursor-pointer
                    ${
                        activeTab === tab
                            ? "border-indigo-500 text-indigo-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}
                                    >
                                        {tab} Station
                                    </button>
                                )
                            )}
                        </nav>
                    </div>
                )}

                {/* --- GRADING STATIONS --- */}
                {isStaff && (
                    <div className="bg-white shadow rounded-lg p-6 border border-gray-100">
                        {activeTab === "math" && (
                            <IndividualGrading
                                competitors={competitors}
                                roundType="math"
                                title="Math Round Grading"
                            />
                        )}
                        {activeTab === "science" && (
                            <IndividualGrading
                                competitors={competitors}
                                roundType="science"
                                title="Science Round Grading"
                            />
                        )}
                        {activeTab === "team" && <TeamGrading teams={teams} />}
                        {activeTab === "design" && (
                            <DesignGrading teams={teams} />
                        )}
                    </div>
                )}

                {/* --- PROCTOR VIEW --- */}
                {role === "proctor" && (
                    <ProctorView competitors={competitors} teams={teams} />
                )}

                {/* --- SCOREBOARD (Admin Only) --- */}
                {role === "admin" && (
                    <section className="pt-8 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">
                                Live Standings
                            </h2>
                            <button
                                onClick={handleCalculate}
                                disabled={loadingScore}
                                className={`
                  px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm
                  ${
                      loadingScore
                          ? "bg-indigo-400 cursor-not-allowed"
                          : "bg-indigo-600 hover:bg-indigo-700"
                  }
                `}
                            >
                                {loadingScore
                                    ? "Running Algorithm..."
                                    : "Recalculate All Scores"}
                            </button>
                        </div>
                        <Scoreboard competitors={competitors} teams={teams} />
                    </section>
                )}
            </main>
        </div>
    );
}
