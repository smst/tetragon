"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Competitor {
    id: string;
    name: string;
    checked_in: boolean;
    team_id: string | null;
}

interface Team {
    id: string;
    name: string;
}

interface TeamGroup {
    teamName: string;
    teamId: string | null;
    competitors: Competitor[];
}

export default function ParticipantCheckInPanel() {
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [teams, setTeams] = useState<Record<string, Team>>({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const fetchData = async () => {
        setLoading(true);

        const { data: teamData } = await supabase
            .from("teams")
            .select("id, name");
        const teamDict: Record<string, Team> = {};
        if (teamData) {
            teamData.forEach((t) => {
                teamDict[t.id] = t;
            });
            setTeams(teamDict);
        }

        const { data: compData } = await supabase
            .from("competitors")
            .select("id, name, checked_in, team_id")
            .order("name");

        if (compData) {
            setCompetitors(compData);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel("realtime-checkins")
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "competitors" },
                (payload) => {
                    const newRow = payload.new as Competitor;
                    setCompetitors((prev) =>
                        prev.map((c) =>
                            c.id === newRow.id
                                ? { ...c, checked_in: newRow.checked_in }
                                : c,
                        ),
                    );
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const groupedData = useMemo(() => {
        const groups: Record<string, TeamGroup> = {};
        const unassignedGroup: TeamGroup = {
            teamName: "Unassigned",
            teamId: null,
            competitors: [],
        };

        competitors.forEach((c) => {
            if (!c.team_id || !teams[c.team_id]) {
                unassignedGroup.competitors.push(c);
            } else {
                const tName = teams[c.team_id].name;
                if (!groups[c.team_id]) {
                    groups[c.team_id] = {
                        teamName: tName,
                        teamId: c.team_id,
                        competitors: [],
                    };
                }
                groups[c.team_id].competitors.push(c);
            }
        });

        const sortedGroups = Object.values(groups).sort((a, b) =>
            a.teamName.localeCompare(b.teamName),
        );
        if (unassignedGroup.competitors.length > 0) {
            sortedGroups.push(unassignedGroup);
        }

        if (!searchQuery) return sortedGroups;

        const lowerQuery = searchQuery.toLowerCase();
        return sortedGroups
            .map((g) => ({
                ...g,
                competitors: g.competitors.filter(
                    (c) =>
                        c.name.toLowerCase().includes(lowerQuery) ||
                        g.teamName.toLowerCase().includes(lowerQuery),
                ),
            }))
            .filter((g) => g.competitors.length > 0);
    }, [competitors, teams, searchQuery]);

    const handleUpdateStatus = async (
        competitorIds: string[],
        checked_in: boolean,
    ) => {
        setIsProcessing(true);

        setCompetitors((prev) =>
            prev.map((c) =>
                competitorIds.includes(c.id) ? { ...c, checked_in } : c,
            ),
        );

        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            setIsProcessing(false);
            return;
        }

        const res = await fetch("/api/registration", {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ competitorIds, checked_in }),
        });

        if (!res.ok) {
            setCompetitors((prev) =>
                prev.map((c) =>
                    competitorIds.includes(c.id)
                        ? { ...c, checked_in: !checked_in }
                        : c,
                ),
            );
            alert("Failed to update check-in status.");
        }
        setIsProcessing(false);
    };

    const overallProgress =
        competitors.length > 0
            ? Math.round(
                  (competitors.filter((c) => c.checked_in).length /
                      competitors.length) *
                      100,
              )
            : 0;

    if (loading) {
        return (
            <div className="p-8 text-center text-gray-500 animate-pulse">
                Loading registration data...
            </div>
        );
    }

    return (
        <section className="bg-white shadow-lg border border-gray-300 rounded-2xl p-8 transition-all duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">
                        Morning Registration
                    </h2>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    {!isCollapsed && (
                        <>
                            <div className="flex flex-col items-end sm:flex">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    Total Checked In
                                </span>
                                <span className="text-lg font-bold text-blue-700">
                                    {
                                        competitors.filter((c) => c.checked_in)
                                            .length
                                    }{" "}
                                    / {competitors.length}
                                </span>
                            </div>
                            <input
                                type="text"
                                placeholder="Search student or team..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                            />
                        </>
                    )}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="flex items-center justify-center gap-2 px-3 py-2 text-gray-600 transition-colors cursor-pointer whitespace-nowrap"
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
                <>
                    <div className="w-full bg-gray-100 rounded-full h-2 mb-6 overflow-hidden">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${overallProgress}%` }}
                        ></div>
                    </div>

                    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 no-scrollbar">
                        {groupedData.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 italic border-2 border-dashed border-gray-200 rounded-xl">
                                No teams or students match your search.
                            </div>
                        ) : (
                            groupedData.map((group) => {
                                const allCheckedIn = group.competitors.every(
                                    (c) => c.checked_in,
                                );

                                return (
                                    <div
                                        key={group.teamId || "unassigned"}
                                        className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white"
                                    >
                                        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-bold text-gray-800">
                                                    {group.teamName}
                                                </h3>
                                                <span className="text-xs font-medium bg-white text-gray-500 border border-gray-200 px-2 py-0.5 rounded-md">
                                                    {
                                                        group.competitors.filter(
                                                            (c) => c.checked_in,
                                                        ).length
                                                    }{" "}
                                                    / {group.competitors.length}{" "}
                                                    Present
                                                </span>
                                            </div>
                                            <button
                                                disabled={isProcessing}
                                                onClick={() =>
                                                    handleUpdateStatus(
                                                        group.competitors.map(
                                                            (c) => c.id,
                                                        ),
                                                        !allCheckedIn,
                                                    )
                                                }
                                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50 ${
                                                    allCheckedIn
                                                        ? "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                                                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
                                                }`}
                                            >
                                                {allCheckedIn
                                                    ? "Uncheck All"
                                                    : "Check In Entire Team"}
                                            </button>
                                        </div>
                                        <div className="divide-y divide-gray-100">
                                            {group.competitors.map((comp) => (
                                                <div
                                                    key={comp.id}
                                                    className="flex justify-between items-center px-5 py-3 hover:bg-gray-50 transition-colors"
                                                >
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {comp.name}
                                                    </span>
                                                    <button
                                                        disabled={isProcessing}
                                                        onClick={() =>
                                                            handleUpdateStatus(
                                                                [comp.id],
                                                                !comp.checked_in,
                                                            )
                                                        }
                                                        className={`w-28 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                                                            comp.checked_in
                                                                ? "bg-green-100 text-green-700 hover:bg-green-200 border border-green-200"
                                                                : "bg-white border border-gray-300 text-gray-500 hover:bg-gray-100"
                                                        }`}
                                                    >
                                                        {comp.checked_in
                                                            ? "Present"
                                                            : "Mark Present"}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}
        </section>
    );
}
