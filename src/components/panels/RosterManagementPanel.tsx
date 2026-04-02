"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface EditableCompetitor {
    id: string;
    name: string;
    team_id: string | null;
    grade: number | null;
    is_captain: boolean;
    _isNew?: boolean;
    _isDirty?: boolean;
}

interface EditableTeam {
    id: string;
    name: string;
    room: number | null;
    _isNew?: boolean;
    _isDirty?: boolean;
}

type TabType = "competitors" | "teams";

export default function RosterManagementPanel() {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>("competitors");

    const [competitors, setCompetitors] = useState<EditableCompetitor[]>([]);
    const [teams, setTeams] = useState<EditableTeam[]>([]);
    const [deletedCompetitors, setDeletedCompetitors] = useState<string[]>([]);

    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{
        type: "success" | "error" | "";
        text: string;
    }>({ type: "", text: "" });

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

    const loadData = async () => {
        setLoading(true);
        setSaveStatus({ type: "", text: "" });
        setDeletedCompetitors([]);

        try {
            const teamData = await fetchAllRecords("teams", "id, name, room");
            setTeams(teamData.sort((a, b) => a.name.localeCompare(b.name)));

            const compData = await fetchAllRecords(
                "competitors",
                "id, name, team_id, grade, is_captain",
            );
            setCompetitors(
                compData.sort((a, b) => a.name.localeCompare(b.name)),
            );
        } catch (err) {
            console.error(err);
        }

        setLoading(false);
    };

    useEffect(() => {
        if (!isCollapsed) {
            loadData();
        }
    }, [isCollapsed]);

    const updateCompetitor = (
        id: string,
        field: keyof EditableCompetitor,
        value: any,
    ) => {
        setCompetitors((prev) =>
            prev.map((c) =>
                c.id === id ? { ...c, [field]: value, _isDirty: true } : c,
            ),
        );
    };

    const deleteCompetitor = (id: string, isNew?: boolean) => {
        setCompetitors((prev) => prev.filter((c) => c.id !== id));
        if (!isNew) {
            setDeletedCompetitors((prev) => [...prev, id]);
        }
    };

    const updateTeam = (id: string, field: keyof EditableTeam, value: any) => {
        setTeams((prev) =>
            prev.map((t) =>
                t.id === id ? { ...t, [field]: value, _isDirty: true } : t,
            ),
        );
    };

    const createNewCompetitor = () => {
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setCompetitors((prev) => [
            {
                id: tempId,
                name: "New Participant",
                team_id: null,
                grade: null,
                is_captain: false,
                _isNew: true,
                _isDirty: true,
            },
            ...prev,
        ]);
    };

    const createNewTeam = () => {
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setTeams((prev) => [
            {
                id: tempId,
                name: "New Team",
                room: null,
                _isNew: true,
                _isDirty: true,
            },
            ...prev,
        ]);
    };

    const hasChanges =
        competitors.some((c) => c._isDirty) ||
        teams.some((t) => t._isDirty) ||
        deletedCompetitors.length > 0;

    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus({ type: "", text: "" });

        try {
            if (deletedCompetitors.length > 0) {
                const { error } = await supabase
                    .from("competitors")
                    .delete()
                    .in("id", deletedCompetitors);
                if (error)
                    throw new Error(
                        "Failed to delete participants: " + error.message,
                    );
            }

            const dirtyTeams = teams.filter((t) => t._isDirty);
            const newTeams = dirtyTeams
                .filter((t) => t._isNew)
                .map((t) => ({ name: t.name, room: t.room }));
            const existingTeams = dirtyTeams
                .filter((t) => !t._isNew)
                .map((t) => ({ id: t.id, name: t.name, room: t.room }));

            if (newTeams.length > 0) {
                const { error } = await supabase.from("teams").insert(newTeams);
                if (error)
                    throw new Error("Failed to insert teams: " + error.message);
            }
            if (existingTeams.length > 0) {
                const { error } = await supabase
                    .from("teams")
                    .upsert(existingTeams);
                if (error)
                    throw new Error("Failed to update teams: " + error.message);
            }

            const dirtyComps = competitors.filter((c) => c._isDirty);
            const newComps = dirtyComps
                .filter((c) => c._isNew)
                .map((c) => ({
                    name: c.name,
                    team_id:
                        c.team_id && !c.team_id.startsWith("temp_")
                            ? c.team_id
                            : null,
                    grade: c.grade,
                    is_captain: c.is_captain,
                }));
            const existingComps = dirtyComps
                .filter((c) => !c._isNew)
                .map((c) => ({
                    id: c.id,
                    name: c.name,
                    team_id:
                        c.team_id && !c.team_id.startsWith("temp_")
                            ? c.team_id
                            : null,
                    grade: c.grade,
                    is_captain: c.is_captain,
                }));

            if (newComps.length > 0) {
                const { error } = await supabase
                    .from("competitors")
                    .insert(newComps);
                if (error)
                    throw new Error(
                        "Failed to insert participants: " + error.message,
                    );
            }
            if (existingComps.length > 0) {
                const { error } = await supabase
                    .from("competitors")
                    .upsert(existingComps);
                if (error)
                    throw new Error(
                        "Failed to update participants: " + error.message,
                    );
            }

            setSaveStatus({
                type: "success",
                text: "All changes saved successfully!",
            });
            await loadData();

            setTimeout(() => setSaveStatus({ type: "", text: "" }), 3000);
        } catch (err: any) {
            setSaveStatus({
                type: "error",
                text: err.message || "An error occurred while saving.",
            });
        }

        setIsSaving(false);
    };

    return (
        <section className="bg-white shadow-lg border border-gray-300 rounded-2xl p-8 transition-all duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4 w-full">
                <div className="flex flex-col gap-4">
                    <h2 className="text-xl font-bold text-gray-900">
                        Roster Management
                    </h2>
                    {!isCollapsed && (
                        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-max overflow-x-auto">
                            {[
                                { id: "competitors", label: "Participants" },
                                { id: "teams", label: "Teams" },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() =>
                                        setActiveTab(tab.id as TabType)
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

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto">
                    {!isCollapsed && (
                        <>
                            {saveStatus.text && (
                                <span
                                    className={`text-xs font-semibold ${saveStatus.type === "success" ? "text-green-600" : "text-red-500"}`}
                                >
                                    {saveStatus.text}
                                </span>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={!hasChanges || isSaving}
                                className={`w-full sm:w-auto px-6 py-2 text-sm font-medium rounded-xl shadow-sm transition-all ${
                                    hasChanges && !isSaving
                                        ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95 shadow-blue-300"
                                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                }`}
                            >
                                {isSaving ? "Saving..." : "Save Changes"}
                            </button>
                        </>
                    )}
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
            </div>

            {!isCollapsed && (
                <div className="min-w-0">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500 animate-pulse">
                            Loading roster data...
                        </div>
                    ) : (
                        <div className="border border-gray-300 rounded-xl overflow-x-auto max-h-150 shadow-sm no-scrollbar">
                            <table className="min-w-full border-collapse">
                                <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                                    {activeTab === "competitors" ? (
                                        <tr className="border-b border-gray-100">
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Participant Name
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Team Assignment
                                            </th>
                                            <th className="w-24 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Grade
                                            </th>
                                            <th className="w-24 px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Captain
                                            </th>
                                            <th className="w-16 px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                                        </tr>
                                    ) : (
                                        <tr className="border-b border-gray-100">
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Team Name
                                            </th>
                                            <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Room
                                            </th>
                                        </tr>
                                    )}
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {activeTab === "competitors" &&
                                        competitors.map((comp) => (
                                            <tr
                                                key={comp.id}
                                                className={`hover:bg-gray-50 transition-colors ${comp._isDirty ? "bg-amber-50/20" : ""}`}
                                            >
                                                <td className="px-6 py-3">
                                                    <input
                                                        type="text"
                                                        value={comp.name}
                                                        onChange={(e) =>
                                                            updateCompetitor(
                                                                comp.id,
                                                                "name",
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full px-3 py-1.5 border border-transparent hover:border-gray-200 focus:border-blue-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent focus:bg-white transition-all"
                                                    />
                                                </td>
                                                <td className="px-6 py-3">
                                                    <select
                                                        value={
                                                            comp.team_id || ""
                                                        }
                                                        onChange={(e) =>
                                                            updateCompetitor(
                                                                comp.id,
                                                                "team_id",
                                                                e.target
                                                                    .value ||
                                                                    null,
                                                            )
                                                        }
                                                        className="w-full px-3 py-1.5 border border-transparent hover:border-gray-200 focus:border-blue-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent focus:bg-white cursor-pointer transition-all"
                                                    >
                                                        <option value="">
                                                            Unassigned
                                                        </option>
                                                        {teams.map((t) => (
                                                            <option
                                                                key={t.id}
                                                                value={t.id}
                                                                disabled={
                                                                    t._isNew
                                                                }
                                                            >
                                                                {t.name}{" "}
                                                                {t._isNew
                                                                    ? "(Save team first)"
                                                                    : ""}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <input
                                                        type="number"
                                                        value={comp.grade || ""}
                                                        onChange={(e) =>
                                                            updateCompetitor(
                                                                comp.id,
                                                                "grade",
                                                                parseInt(
                                                                    e.target
                                                                        .value,
                                                                ) || null,
                                                            )
                                                        }
                                                        className="w-full px-3 py-1.5 border border-transparent hover:border-gray-200 focus:border-blue-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent focus:bg-white transition-all"
                                                    />
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            comp.is_captain
                                                        }
                                                        onChange={(e) =>
                                                            updateCompetitor(
                                                                comp.id,
                                                                "is_captain",
                                                                e.target
                                                                    .checked,
                                                            )
                                                        }
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    <button
                                                        onClick={() =>
                                                            deleteCompetitor(
                                                                comp.id,
                                                                comp._isNew,
                                                            )
                                                        }
                                                        className="text-red-400 hover:text-red-600 font-bold transition-colors cursor-pointer"
                                                        title="Delete Participant"
                                                    >
                                                        ✕
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}

                                    {activeTab === "teams" &&
                                        teams.map((team) => (
                                            <tr
                                                key={team.id}
                                                className={`hover:bg-gray-50 transition-colors ${team._isDirty ? "bg-amber-50/20" : ""}`}
                                            >
                                                <td className="px-6 py-3">
                                                    <input
                                                        type="text"
                                                        value={team.name}
                                                        onChange={(e) =>
                                                            updateTeam(
                                                                team.id,
                                                                "name",
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full px-3 py-1.5 border border-transparent hover:border-gray-200 focus:border-blue-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent focus:bg-white transition-all"
                                                    />
                                                </td>
                                                <td className="px-6 py-3">
                                                    <input
                                                        type="number"
                                                        value={team.room || ""}
                                                        onChange={(e) =>
                                                            updateTeam(
                                                                team.id,
                                                                "room",
                                                                parseInt(
                                                                    e.target
                                                                        .value,
                                                                ) || null,
                                                            )
                                                        }
                                                        className="w-full px-3 py-1.5 border border-transparent hover:border-gray-200 focus:border-blue-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent focus:bg-white transition-all"
                                                    />
                                                </td>
                                            </tr>
                                        ))}

                                    <tr className="bg-gray-50 border-t border-gray-300">
                                        <td
                                            colSpan={
                                                activeTab === "competitors"
                                                    ? 5
                                                    : 2
                                            }
                                            className="px-6 py-4"
                                        >
                                            <button
                                                onClick={
                                                    activeTab === "competitors"
                                                        ? createNewCompetitor
                                                        : createNewTeam
                                                }
                                                className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg border border-blue-200"
                                            >
                                                + Add New{" "}
                                                {activeTab === "competitors"
                                                    ? "Participant"
                                                    : "Team"}
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
