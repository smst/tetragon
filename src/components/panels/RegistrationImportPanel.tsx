"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface ParsedRegistration {
    participantName: string;
    grade: string;
    teamName: string;
    raw: string[];
}

export default function RegistrationImportPanel() {
    const [stagedData, setStagedData] = useState<ParsedRegistration[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{
        type: "success" | "error" | "";
        text: string;
    }>({ type: "", text: "" });
    const [existingDbTeams, setExistingDbTeams] = useState<string[]>([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [focusedDropdownIdx, setFocusedDropdownIdx] = useState<number | null>(
        null,
    );

    useEffect(() => {
        const fetchTeams = async () => {
            const { data } = await supabase.from("teams").select("name");
            if (data) {
                setExistingDbTeams(data.map((t) => t.name));
            }
        };
        fetchTeams();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setStatusMessage({ type: "", text: "" });
        const file = e.target.files?.[0];
        if (!file) return;

        const text = await file.text();
        const lines = text.split("\n").filter((line) => line.trim() !== "");

        if (lines.length < 2) return;

        const headers = lines[0].split("\t").map((h) => h.trim());
        const nameIdx = headers.indexOf("Participant Full Name");
        const gradeIdx = headers.indexOf("Grade");
        const teamIdx = headers.indexOf("What is your team name?");

        const parsed: ParsedRegistration[] = [];

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split("\t");
            parsed.push({
                participantName:
                    nameIdx !== -1 ? row[nameIdx]?.trim() || "" : "",
                grade: gradeIdx !== -1 ? row[gradeIdx]?.trim() || "" : "",
                teamName: teamIdx !== -1 ? row[teamIdx]?.trim() || "" : "",
                raw: row,
            });
        }

        setStagedData(parsed);
    };

    const handleCellChange = (
        index: number,
        field: keyof ParsedRegistration,
        value: string,
    ) => {
        const newData = [...stagedData];
        newData[index] = { ...newData[index], [field]: value };
        setStagedData(newData);
    };

    const teamCounts = stagedData.reduce(
        (acc, row) => {
            const t = row.teamName.trim();
            if (t) acc[t] = (acc[t] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>,
    );

    const uniqueTeamMap = new Map<string, string>();
    existingDbTeams.forEach((name) => uniqueTeamMap.set(name, name));
    stagedData.forEach((row) => {
        const name = row.teamName.trim();
        if (name) uniqueTeamMap.set(name, name);
    });
    const allTeamNames = Array.from(uniqueTeamMap.values()).sort((a, b) =>
        a.localeCompare(b),
    );

    const groupedByTeam = stagedData.reduce(
        (acc, row) => {
            const originalName = row.teamName.trim();
            const key = originalName || "UNASSIGNED / NO TEAM";

            if (!acc[key]) {
                acc[key] = {
                    displayName: originalName || "UNASSIGNED / NO TEAM",
                    members: [],
                };
            }
            acc[key].members.push(row);
            return acc;
        },
        {} as Record<
            string,
            { displayName: string; members: ParsedRegistration[] }
        >,
    );

    const handleImport = async () => {
        setShowConfirm(false);
        setIsImporting(true);
        setStatusMessage({ type: "", text: "" });

        const uniqueTeams = Array.from(
            new Set(stagedData.map((d) => d.teamName.trim()).filter(Boolean)),
        );
        const teamIdMap: Record<string, string> = {};

        for (const teamName of uniqueTeams) {
            const { data: existingTeam } = await supabase
                .from("teams")
                .select("id")
                .ilike("name", teamName)
                .single();

            if (existingTeam) {
                teamIdMap[teamName] = existingTeam.id;
            } else {
                const { data: newTeam } = await supabase
                    .from("teams")
                    .insert({ name: teamName })
                    .select("id")
                    .single();

                if (newTeam) {
                    teamIdMap[teamName] = newTeam.id;
                }
            }
        }

        const competitorsToInsert = stagedData.map((row) => ({
            name: row.participantName.trim(),
            grade: row.grade.trim(),
            team_id: row.teamName.trim()
                ? teamIdMap[row.teamName.trim()]
                : null,
        }));

        const { error } = await supabase
            .from("competitors")
            .insert(competitorsToInsert);

        setIsImporting(false);
        if (!error) {
            setStagedData([]);
            setStatusMessage({
                type: "success",
                text: `Import successful! Added ${competitorsToInsert.length} competitors.`,
            });
        } else {
            setStatusMessage({
                type: "error",
                text: `Error during import: ${error.message}`,
            });
        }
    };

    return (
        <section className="bg-white shadow-lg border border-gray-300 rounded-2xl p-8 relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">
                        Import Registrations
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Upload a Google Sheets TSV export to review and
                        batch-import competitors and teams.
                    </p>
                </div>
            </div>

            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl px-4 py-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Upload TSV File
                </label>
                <input
                    type="file"
                    accept=".tsv"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors cursor-pointer"
                />
            </div>

            {statusMessage.text && (
                <div
                    className={`px-5 py-3 rounded-xl mb-6 text-sm font-medium border ${
                        statusMessage.type === "success"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                    }`}
                >
                    {statusMessage.text}
                </div>
            )}

            {stagedData.length > 0 && (
                <div className="space-y-4">
                    <div className="shadow-md rounded-xl">
                        <div className="border border-gray-300 rounded-xl overflow-x-auto max-h-[600px]">
                            <table className="min-w-full border-collapse">
                                <thead className="bg-gray-100 sticky top-0 z-10">
                                    <tr className="border-b border-gray-300">
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Participant Name
                                        </th>
                                        <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Grade
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Team Name
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {stagedData.map((row, i) => {
                                        const tName = row.teamName.trim();
                                        const isUnique =
                                            tName && teamCounts[tName] === 1;
                                        const isDropdownOpen =
                                            focusedDropdownIdx === i;

                                        const filteredTeams =
                                            allTeamNames.filter(
                                                (name) =>
                                                    name.includes(tName) &&
                                                    name !== tName,
                                            );

                                        return (
                                            <tr
                                                key={i}
                                                className="border-b border-gray-200 hover:bg-gray-50 transition-colors last:border-0"
                                            >
                                                <td className="px-6 py-3 whitespace-nowrap">
                                                    <input
                                                        type="text"
                                                        value={
                                                            row.participantName
                                                        }
                                                        onChange={(e) =>
                                                            handleCellChange(
                                                                i,
                                                                "participantName",
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white"
                                                    />
                                                </td>
                                                <td className="w-32 px-6 py-3 whitespace-nowrap">
                                                    <input
                                                        type="text"
                                                        value={row.grade}
                                                        onChange={(e) =>
                                                            handleCellChange(
                                                                i,
                                                                "grade",
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white"
                                                    />
                                                </td>
                                                <td className="px-6 py-3 whitespace-nowrap">
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            value={row.teamName}
                                                            onChange={(e) =>
                                                                handleCellChange(
                                                                    i,
                                                                    "teamName",
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            onFocus={() =>
                                                                setFocusedDropdownIdx(
                                                                    i,
                                                                )
                                                            }
                                                            onBlur={() =>
                                                                setTimeout(
                                                                    () =>
                                                                        setFocusedDropdownIdx(
                                                                            null,
                                                                        ),
                                                                    200,
                                                                )
                                                            }
                                                            className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-shadow ${
                                                                isUnique
                                                                    ? "border-amber-400 bg-amber-50 text-amber-900 focus:ring-amber-500 pr-8"
                                                                    : "border-gray-200 bg-white focus:ring-blue-500"
                                                            }`}
                                                        />
                                                        {isUnique && (
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-3 w-3 pointer-events-none">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                                            </span>
                                                        )}
                                                        {isDropdownOpen &&
                                                            filteredTeams.length >
                                                                0 && (
                                                                <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                                                    {filteredTeams.map(
                                                                        (
                                                                            match,
                                                                            idx,
                                                                        ) => (
                                                                            <li
                                                                                key={
                                                                                    idx
                                                                                }
                                                                                onMouseDown={(
                                                                                    e,
                                                                                ) =>
                                                                                    e.preventDefault()
                                                                                }
                                                                                onClick={() => {
                                                                                    handleCellChange(
                                                                                        i,
                                                                                        "teamName",
                                                                                        match,
                                                                                    );
                                                                                    setFocusedDropdownIdx(
                                                                                        null,
                                                                                    );
                                                                                }}
                                                                                className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors"
                                                                            >
                                                                                {
                                                                                    match
                                                                                }
                                                                            </li>
                                                                        ),
                                                                    )}
                                                                </ul>
                                                            )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-4">
                        <span className="text-sm text-gray-500">
                            <span className="inline-block w-3 h-3 bg-amber-500 rounded-full mr-1"></span>
                            Highlighted teams only have 1 member. Check for
                            typos.
                        </span>
                        <button
                            onClick={() => setShowConfirm(true)}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md shadow-blue-300 transition-all active:scale-95 cursor-pointer"
                        >
                            Review and Import
                        </button>
                    </div>
                </div>
            )}

            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    Confirm Team Placements
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Review the breakdown below before inserting
                                    into the database.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 bg-gray-50 space-y-4">
                            {Object.values(groupedByTeam)
                                .sort((a, b) =>
                                    a.displayName.localeCompare(b.displayName),
                                )
                                .map(({ displayName, members }) => (
                                    <div
                                        key={displayName}
                                        className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
                                    >
                                        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                                            <span className="font-semibold text-gray-800">
                                                {displayName}
                                            </span>
                                            <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200">
                                                {members.length}{" "}
                                                {members.length === 1
                                                    ? "Member"
                                                    : "Members"}
                                            </span>
                                        </div>
                                        <div className="p-3">
                                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {members.map((m, idx) => (
                                                    <li
                                                        key={idx}
                                                        className="text-sm text-gray-600 flex items-center gap-2"
                                                    >
                                                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                                        {m.participantName || (
                                                            <span className="italic text-gray-400">
                                                                Unnamed
                                                            </span>
                                                        )}
                                                        <span className="text-gray-400 text-xs">
                                                            (Grade{" "}
                                                            {m.grade || "?"})
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-5 py-2.5 text-gray-600 font-medium border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel and Edit
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={isImporting}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md shadow-blue-300 transition-all active:scale-95 cursor-pointer disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isImporting
                                    ? "Inserting Data..."
                                    : "Finalize Import"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
