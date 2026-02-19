"use client";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useTournamentData } from "@/hooks/useTournamentData";

export default function ScoreboardPanel() {
    // Connect directly to SWR cache
    const { competitors, teams, refreshData } = useTournamentData();

    const [activeTab, setActiveTab] = useState("individual");
    const [gradeFilter, setGradeFilter] = useState("all");
    const [sortConfig, setSortConfig] = useState({
        key: "total",
        direction: "desc",
    });
    const [loadingScore, setLoadingScore] = useState(false);

    useEffect(() => {
        if (activeTab === "individual") {
            setSortConfig({ key: "total", direction: "desc" });
        } else if (activeTab === "team") {
            setSortConfig({ key: "overall_score", direction: "desc" });
        } else if (activeTab === "design") {
            setSortConfig({ key: "design_round_score", direction: "desc" });
        }
    }, [activeTab]);

    const handleCalculate = async () => {
        setLoadingScore(true);
        try {
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
            await refreshData(); // Instantly syncs the UI
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setLoadingScore(false);
        }
    };

    const processedData = useMemo(() => {
        if (activeTab === "individual") {
            return competitors
                .filter(
                    (c) =>
                        gradeFilter === "all" ||
                        String(c.grade) === gradeFilter,
                )
                .map((c) => ({
                    ...c,
                    math: c.math_round_score || 0,
                    science: c.science_round_score || 0,
                    total:
                        (c.math_round_score || 0) +
                        (c.science_round_score || 0),
                }));
        } else {
            return teams.map((t) => ({
                ...t,
                team_round_score: t.team_round_score || 0,
                design_round_score: t.design_round_score || 0,
                overall_score: t.overall_score || 0,
            }));
        }
    }, [competitors, teams, activeTab, gradeFilter]);

    const sortedData = useMemo(() => {
        let sorted = [...processedData];
        sorted.sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
            if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [processedData, sortConfig]);

    const requestSort = (key) => {
        let direction = "desc";
        if (sortConfig.key === key && sortConfig.direction === "desc") {
            direction = "asc";
        }
        setSortConfig({ key, direction });
    };

    const getClassNamesFor = (name) => {
        if (sortConfig.key !== name)
            return "text-gray-400 opacity-0 group-hover:opacity-50";
        return sortConfig.direction === "asc"
            ? "text-blue-700 rotate-180"
            : "text-blue-700";
    };

    const SortableHeader = ({ label, sortKey, isHighlighted }) => (
        <th
            onClick={() => requestSort(sortKey)}
            className={`group px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none ${
                isHighlighted ? "text-gray-900 bg-gray-100" : "text-gray-500"
            }`}
        >
            <div className="flex items-center gap-1">
                {label}
                <svg
                    className={`w-3 h-3 transform transition-transform ${getClassNamesFor(sortKey)}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                    />
                </svg>
            </div>
        </th>
    );

    return (
        <section className="bg-white shadow-lg border border-gray-300 rounded-2xl p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-gray-900">Scoreboard</h2>
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

            <div className="flex flex-col space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                        {[
                            { id: "individual", label: "Individuals" },
                            { id: "team", label: "Teams (Cumulative)" },
                            { id: "design", label: "Design Challenge" },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                                    activeTab === tab.id
                                        ? "bg-white shadow text-blue-700"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === "individual" && (
                        <div className="flex items-center space-x-2">
                            <label className="text-sm font-medium text-gray-700">
                                Grade Level:
                            </label>
                            <select
                                value={gradeFilter}
                                onChange={(e) => setGradeFilter(e.target.value)}
                                className="block w-32 py-1.5 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm cursor-pointer"
                            >
                                <option value="all">All Grades</option>
                                <option value="6">6th Grade</option>
                                <option value="7">7th Grade</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                        <div className="shadow-md overflow-hidden border border-gray-300 rounded-xl bg-white mb-5">
                            <table className="min-w-full border-collapse">
                                <thead className="bg-gray-50 border-b border-gray-300">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Rank
                                        </th>
                                        {activeTab === "individual" && (
                                            <>
                                                <SortableHeader
                                                    label="Name"
                                                    sortKey="name"
                                                />
                                                <SortableHeader
                                                    label="Grade"
                                                    sortKey="grade"
                                                />
                                                <SortableHeader
                                                    label="Math"
                                                    sortKey="math"
                                                />
                                                <SortableHeader
                                                    label="Science"
                                                    sortKey="science"
                                                />
                                                <SortableHeader
                                                    label="Overall"
                                                    sortKey="total"
                                                    isHighlighted={true}
                                                />
                                            </>
                                        )}
                                        {activeTab === "team" && (
                                            <>
                                                <SortableHeader
                                                    label="Team Name"
                                                    sortKey="name"
                                                />
                                                <SortableHeader
                                                    label="Team Round"
                                                    sortKey="team_round_score"
                                                />
                                                <SortableHeader
                                                    label="Design"
                                                    sortKey="design_round_score"
                                                />
                                                <SortableHeader
                                                    label="Overall"
                                                    sortKey="overall_score"
                                                    isHighlighted={true}
                                                />
                                            </>
                                        )}
                                        {activeTab === "design" && (
                                            <>
                                                <SortableHeader
                                                    label="Team Name"
                                                    sortKey="name"
                                                />
                                                <SortableHeader
                                                    label="Design Score"
                                                    sortKey="design_round_score"
                                                    isHighlighted={true}
                                                />
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {sortedData.map((row, index) => (
                                        <tr
                                            key={row.id}
                                            className="border-b border-gray-200 hover:bg-blue-50 transition-colors last:border-0"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                #{index + 1}
                                            </td>
                                            {activeTab === "individual" && (
                                                <>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {row.name}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {row.grade || "-"}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {row.math.toFixed(3)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {row.science.toFixed(3)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700">
                                                        {row.total.toFixed(3)}
                                                    </td>
                                                </>
                                            )}
                                            {activeTab === "team" && (
                                                <>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {row.name}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {row.team_round_score.toFixed(
                                                            3,
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {row.design_round_score.toFixed(
                                                            3,
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700">
                                                        {row.overall_score.toFixed(
                                                            3,
                                                        )}
                                                    </td>
                                                </>
                                            )}
                                            {activeTab === "design" && (
                                                <>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {row.name}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700">
                                                        {row.design_round_score.toFixed(
                                                            3,
                                                        )}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                    {sortedData.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan="6"
                                                className="px-6 py-8 text-center text-sm text-gray-500"
                                            >
                                                No data available.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
