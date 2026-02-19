"use client";
import { useState } from "react";
import IndividualGrading from "@/components/grading/IndividualGrading";
import TeamGrading from "@/components/grading/TeamGrading";
import DesignGrading from "@/components/grading/DesignGrading";
import { useTournamentData } from "@/hooks/useTournamentData";

export default function GradingPanel() {
    const { competitors, teams } = useTournamentData();

    const [activeTab, setActiveTab] = useState("math");

    return (
        <section className="bg-white shadow-lg border border-gray-300 rounded-2xl p-8">
            <div className="flex flex-col gap-4 mb-6 border-b border-gray-200 pb-6">
                <h2 className="text-xl font-bold text-gray-900">Grading</h2>
                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-full sm:w-max overflow-x-auto">
                    {[
                        { id: "math", label: "Math" },
                        { id: "science", label: "Science" },
                        { id: "team", label: "Team" },
                        { id: "design", label: "Design" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
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
            </div>

            <div>
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
                {activeTab === "design" && <DesignGrading teams={teams} />}
            </div>
        </section>
    );
}
