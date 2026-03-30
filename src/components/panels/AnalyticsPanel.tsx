"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface QuestionStat {
    question: string;
    total: number;
    correct: number;
    percent: number;
}

type AnalyticsTab = "math" | "science" | "team";

export default function AnalyticsPanel() {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [activeTab, setActiveTab] = useState<AnalyticsTab>("math");
    const [loading, setLoading] = useState(false);

    const [mathStats, setMathStats] = useState<QuestionStat[]>([]);
    const [scienceStats, setScienceStats] = useState<QuestionStat[]>([]);
    const [teamStats, setTeamStats] = useState<QuestionStat[]>([]);

    const fetchAllRecords = async (tableName: string, selectQuery: string) => {
        const allData: any[] = [];
        let start = 0;
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase
                .from(tableName)
                .select(selectQuery)
                .range(start, start + limit - 1);

            if (error || !data) {
                hasMore = false;
                break;
            }

            allData.push(...data);

            if (data.length < limit) {
                hasMore = false;
            } else {
                start += limit;
            }
        }
        return allData;
    };

    const loadAnalytics = async () => {
        setLoading(true);

        const [mathData, scienceData, teamData] = await Promise.all([
            fetchAllRecords(
                "math_round_responses",
                "question_number, is_correct",
            ),
            fetchAllRecords(
                "science_round_responses",
                "question_number, is_correct",
            ),
            fetchAllRecords("team_round_responses", "question_key, is_correct"),
        ]);

        const processIndividual = (data: any[]) => {
            const stats: Record<string, { total: number; correct: number }> =
                {};
            data.forEach((r) => {
                const q = r.question_number;
                if (!stats[q]) stats[q] = { total: 0, correct: 0 };
                stats[q].total++;
                if (r.is_correct) stats[q].correct++;
            });

            return Object.keys(stats)
                .map((q) => ({
                    question: q,
                    total: stats[q].total,
                    correct: stats[q].correct,
                    percent:
                        Math.round((stats[q].correct / stats[q].total) * 100) ||
                        0,
                }))
                .sort((a, b) => parseInt(a.question) - parseInt(b.question));
        };

        const processTeam = (data: any[]) => {
            const stats: Record<string, { total: number; correct: number }> =
                {};
            data.forEach((r) => {
                const q = r.question_key;
                if (!stats[q]) stats[q] = { total: 0, correct: 0 };
                stats[q].total++;
                if (r.is_correct) stats[q].correct++;
            });

            return Object.keys(stats)
                .map((q) => {
                    const formattedQ = q
                        .replace("math_", "M")
                        .replace("science_", "S");
                    return {
                        question: formattedQ,
                        total: stats[q].total,
                        correct: stats[q].correct,
                        percent:
                            Math.round(
                                (stats[q].correct / stats[q].total) * 100,
                            ) || 0,
                    };
                })
                .sort((a, b) => {
                    const aMatch = a.question.match(/([A-Z])(\d+)([a-z]?)/);
                    const bMatch = b.question.match(/([A-Z])(\d+)([a-z]?)/);
                    if (!aMatch || !bMatch)
                        return a.question.localeCompare(b.question);
                    if (aMatch[1] !== bMatch[1])
                        return aMatch[1].localeCompare(bMatch[1]);
                    if (parseInt(aMatch[2]) !== parseInt(bMatch[2]))
                        return parseInt(aMatch[2]) - parseInt(bMatch[2]);
                    return (aMatch[3] || "").localeCompare(bMatch[3] || "");
                });
        };

        setMathStats(processIndividual(mathData));
        setScienceStats(processIndividual(scienceData));
        setTeamStats(processTeam(teamData));

        setLoading(false);
    };

    useEffect(() => {
        if (!isCollapsed) {
            loadAnalytics();
        }
    }, [isCollapsed]);

    const getScoreColor = (percent: number) => {
        if (percent >= 80) return "text-green-600 bg-green-50 border-green-200";
        if (percent >= 50) return "text-amber-600 bg-amber-50 border-amber-200";
        return "text-red-600 bg-red-50 border-red-200";
    };

    const renderGrid = (stats: QuestionStat[]) => {
        if (stats.length === 0) {
            return (
                <div className="text-center py-8 text-gray-400 italic border-2 border-dashed border-gray-200 rounded-xl">
                    No grading data available for this round yet.
                </div>
            );
        }

        return (
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
                {stats.map((stat, idx) => (
                    <div
                        key={idx}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border ${getScoreColor(
                            stat.percent,
                        )}`}
                    >
                        <span className="text-xs font-bold tracking-wider opacity-70 mb-1">
                            {stat.question}
                        </span>
                        <span className="text-xl font-extrabold">
                            {stat.percent}%
                        </span>
                        <span className="text-[10px] font-medium opacity-60 mt-1">
                            {stat.correct}/{stat.total}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <section className="bg-white shadow-lg border border-gray-300 rounded-2xl p-8 transition-all duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4 w-full">
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-bold text-gray-900">
                        Analytics
                    </h2>
                    {!isCollapsed && (
                        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-max overflow-x-auto">
                            {[
                                { id: "math", label: "Math" },
                                { id: "science", label: "Science" },
                                { id: "team", label: "Team Round" },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() =>
                                        setActiveTab(tab.id as AnalyticsTab)
                                    }
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
                </div>
                <div className="flex items-center gap-3">
                    {!isCollapsed && (
                        <button
                            onClick={loadAnalytics}
                            disabled={loading}
                            className="flex items-center justify-center p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-600 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                            title="Refresh Data"
                        >
                            <svg
                                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
                    >
                        <svg
                            className={`w-4 h-4 transition-transform duration-200 ${
                                isCollapsed ? "rotate-180" : ""
                            }`}
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
            </div>

            {!isCollapsed && (
                <div className="min-w-0">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500 animate-pulse">
                            Calculating analytics...
                        </div>
                    ) : (
                        <>
                            {activeTab === "math" && renderGrid(mathStats)}
                            {activeTab === "science" &&
                                renderGrid(scienceStats)}
                            {activeTab === "team" && renderGrid(teamStats)}
                        </>
                    )}
                </div>
            )}
        </section>
    );
}
