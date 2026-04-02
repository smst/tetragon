"use client";
import { useState } from "react";
import IndividualGrading from "@/components/grading/IndividualGrading";
import TeamGrading from "@/components/grading/TeamGrading";
import DesignGrading from "@/components/grading/DesignGrading";
import { useTournamentData } from "@/hooks/useTournamentData";

export default function GradingPanel() {
    const { competitors, teams } = useTournamentData();

    const [activeTab, setActiveTab] = useState<
        "math" | "science" | "team" | "design"
    >("math");
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <section className="bg-white shadow-lg border border-gray-300 rounded-2xl p-8 transition-all duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 w-full">
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-bold text-gray-900">Grading</h2>
                </div>

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap w-full sm:w-auto"
                >
                    <svg
                        className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </button>
            </div>

            {!isCollapsed && (
                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-max overflow-x-auto">
                    {[
                        { id: "math", label: "Math" },
                        { id: "science", label: "Science" },
                        { id: "team", label: "Team" },
                        { id: "design", label: "Design" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                                activeTab === tab.id
                                    ? "bg-white shadow text-blue-700"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {!isCollapsed && (
                <div className="min-w-0 mt-4">
                    {activeTab === "math" && (
                        <IndividualGrading
                            competitors={competitors}
                            roundType="math"
                        />
                    )}
                    {activeTab === "science" && (
                        <IndividualGrading
                            competitors={competitors}
                            roundType="science"
                        />
                    )}
                    {activeTab === "team" && <TeamGrading teams={teams} />}
                    {activeTab === "design" && <DesignGrading teams={teams} />}
                </div>
            )}
        </section>
    );
}
