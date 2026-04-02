"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface DetailedCompetitor {
    id: string;
    name: string;
    teamName: string;
    math_correct: number;
    math_score: number;
    science_correct: number;
    science_score: number;
}

export default function DetailedResultsPanel() {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<DetailedCompetitor[]>([]);

    const loadResults = async () => {
        setLoading(true);

        const { data: teamData } = await supabase
            .from("teams")
            .select("id, name");
        const teamMap: Record<string, string> = {};
        if (teamData) {
            teamData.forEach((t) => {
                teamMap[t.id] = t.name;
            });
        }

        const allComps: any[] = [];
        let start = 0;
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase
                .from("competitors")
                .select(
                    "id, name, team_id, math_correct_count, math_round_score, science_correct_count, science_round_score",
                )
                .range(start, start + limit - 1);

            if (error || !data) {
                hasMore = false;
                break;
            }

            allComps.push(...data);

            if (data.length < limit) {
                hasMore = false;
            } else {
                start += limit;
            }
        }

        const formattedResults: DetailedCompetitor[] = allComps
            .map((c) => ({
                id: c.id,
                name: c.name,
                teamName: c.team_id
                    ? teamMap[c.team_id] || "Unknown Team"
                    : "Unassigned",
                math_correct: c.math_correct_count || 0,
                math_score: c.math_round_score || 0,
                science_correct: c.science_correct_count || 0,
                science_score: c.science_round_score || 0,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        setResults(formattedResults);
        setLoading(false);
    };

    useEffect(() => {
        if (!isCollapsed) {
            loadResults();
        }
    }, [isCollapsed]);

    return (
        <section className="bg-white shadow-lg border border-gray-300 rounded-2xl p-8 transition-all duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 w-full">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-gray-900">
                        Post-Tournament Results
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    {!isCollapsed && (
                        <button
                            onClick={loadResults}
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
                        className="flex items-center justify-center gap-2 px-3 py-2 font-medium text-gray-600 transition-colors cursor-pointer whitespace-nowrap"
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
            </div>

            {!isCollapsed && (
                <div className="min-w-0">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500 animate-pulse">
                            Loading detailed records...
                        </div>
                    ) : (
                        <div className="border border-gray-300 rounded-xl overflow-x-auto max-h-150 shadow-sm no-scrollbar">
                            <table className="min-w-full border-collapse">
                                <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                                    <tr className="border-b border-gray-100">
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                            Team
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Math Correct
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                            Math Score
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Sci Correct
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            Sci Score
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {results.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-6 py-8 text-center text-sm text-gray-400 italic"
                                            >
                                                No records found.
                                            </td>
                                        </tr>
                                    ) : (
                                        results.map((r) => (
                                            <tr
                                                key={r.id}
                                                className="hover:bg-gray-50 transition-colors"
                                            >
                                                <td className="px-6 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                                                    {r.name}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap border-r border-gray-100">
                                                    {r.teamName}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-900 text-right whitespace-nowrap font-mono">
                                                    {r.math_correct} / 20
                                                </td>
                                                <td className="px-6 py-3 text-sm font-bold text-blue-700 text-right whitespace-nowrap border-r border-gray-100">
                                                    {r.math_score.toFixed(3)}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-900 text-right whitespace-nowrap font-mono">
                                                    {r.science_correct} / 20
                                                </td>
                                                <td className="px-6 py-3 text-sm font-bold text-green-700 text-right whitespace-nowrap">
                                                    {r.science_score.toFixed(3)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
