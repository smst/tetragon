"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useTournamentData } from "@/hooks/useTournamentData";
import { useUser } from "@/context/UserContext";
import { Competitor } from "@/types";

const TIMEZONE = "America/New_York";

const TIME_WINDOWS = {
    Morning: { openHour: 9, openMin: 30, closeHour: 9, closeMin: 45 },
    Afternoon: { openHour: 12, openMin: 15, closeHour: 13, closeMin: 0 },
} as const;

type Period = keyof typeof TIME_WINDOWS;

function fmt(h: number, m: number) {
    const suffix = h >= 12 ? "PM" : "AM";
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function getNowEastern(): number {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TIMEZONE,
        hour: "numeric",
        minute: "numeric",
        hour12: false,
    }).formatToParts(new Date());
    const h = parseInt(parts.find((p) => p.type === "hour")!.value, 10);
    const m = parseInt(parts.find((p) => p.type === "minute")!.value, 10);
    return h * 60 + m;
}

function getWindowStatus(period: Period): "before" | "open" | "closed" {
    const now = getNowEastern();
    const win = TIME_WINDOWS[period];
    const open = win.openHour * 60 + win.openMin;
    const close = win.closeHour * 60 + win.closeMin;
    if (now < open) return "before";
    if (now > close) return "closed";
    return "open";
}

function windowLabel(period: Period): string {
    const win = TIME_WINDOWS[period];
    return `${fmt(win.openHour, win.openMin)} – ${fmt(win.closeHour, win.closeMin)} ET`;
}

interface ProctorRooms {
    morning_room: number | null;
    afternoon_room: number | null;
}

// ── Proctor sub-panel ─────────────────────────────────────────────────────────

interface AttendanceSubPanelProps {
    period: Period;
    room: number | null;
    competitors: Competitor[];
}

function AttendanceSubPanel({
    period,
    room,
    competitors,
}: AttendanceSubPanelProps) {
    const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
    const [status, setStatus] = useState<string>("");
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [hasExisting, setHasExisting] = useState<boolean>(false);
    const [loadingExisting, setLoadingExisting] = useState<boolean>(true);
    const [windowStatus, setWindowStatus] = useState<
        "before" | "open" | "closed"
    >(() => getWindowStatus(period));

    useEffect(() => {
        setWindowStatus(getWindowStatus(period));
        const id = setInterval(
            () => setWindowStatus(getWindowStatus(period)),
            5_000,
        );
        return () => clearInterval(id);
    }, [period]);

    const roomCompetitors = useMemo(
        () =>
            room
                ? competitors
                      .filter(
                          (c) => c.team?.room?.toString() === room.toString(),
                      )
                      .sort((a, b) => {
                          const teamCmp = (a.team?.name ?? "").localeCompare(
                              b.team?.name ?? "",
                          );
                          return teamCmp !== 0
                              ? teamCmp
                              : a.name.localeCompare(b.name);
                      })
                : [],
        [competitors, room],
    );

    const fetchExisting = useCallback(async () => {
        setLoadingExisting(true);
        const {
            data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
            setLoadingExisting(false);
            return;
        }

        const { data, error } = await supabase
            .from("attendance_logs")
            .select("competitor_id")
            .eq("recorded_by", session.user.id)
            .eq("check_in_period", period);

        if (error) {
            console.error("fetchExisting error:", error.message);
            setLoadingExisting(false);
            return;
        }

        if (data && data.length > 0) {
            setHasExisting(true);
            setPresentIds(
                new Set<string>(data.map((r: any) => r.competitor_id)),
            );
            setStatus("Attendance has been submitted.");
        } else {
            setHasExisting(false);
            setPresentIds(new Set());
            setStatus("");
        }
        setLoadingExisting(false);
    }, [period]);

    useEffect(() => {
        fetchExisting();
    }, [fetchExisting]);

    const toggleAttendance = (id: string) => {
        setPresentIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
        setStatus("");
    };

    const markAllPresent = () => {
        setPresentIds(new Set(roomCompetitors.map((c) => c.id)));
        setStatus("");
    };

    const submitAttendance = async () => {
        setIsSaving(true);
        setStatus("Saving...");
        const {
            data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
            setStatus("Error: Not authenticated.");
            setIsSaving(false);
            return;
        }

        const res = await fetch("/api/attendance", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                period,
                competitor_ids: Array.from(presentIds),
                has_existing: hasExisting,
            }),
        });

        const json = await res.json();
        if (!res.ok) {
            setStatus("Error: " + json.error);
        } else {
            setStatus(
                `Saved! ${presentIds.size} student${presentIds.size !== 1 ? "s" : ""} marked present.`,
            );
            setHasExisting(true);
        }
        setIsSaving(false);
    };

    const isLocked = windowStatus === "closed" && hasExisting;
    const isDisabled = windowStatus === "before";
    const isDimmed = isLocked || isDisabled;

    const byTeam = useMemo(() => {
        const groups: Record<string, Competitor[]> = {};
        roomCompetitors.forEach((c) => {
            const key = c.team?.name ?? "No Team";
            if (!groups[key]) groups[key] = [];
            groups[key].push(c);
        });
        return groups;
    }, [roomCompetitors]);

    const WindowBanner = () => {
        const isBeforeWindow = windowStatus === "before";
        const isOpen = windowStatus === "open";
        const win = TIME_WINDOWS[period];

        const roomChip = room ? (
            <span className="font-semibold">Room {room}:</span>
        ) : (
            <span className="italic">No room assigned</span>
        );

        const message = isBeforeWindow ? (
            <>
                {roomChip} Attendance opens at {fmt(win.openHour, win.openMin)}{" "}
                ET.
            </>
        ) : isOpen ? (
            <>
                {roomChip} Please take attendance by{" "}
                {fmt(win.closeHour, win.closeMin)} ET.
            </>
        ) : hasExisting ? (
            <>{roomChip} Attendance window closed, attendance is locked.</>
        ) : (
            <>
                {roomChip} Attendance window closed, you may still submit a late
                entry.
            </>
        );

        return (
            <div
                className={`flex items-center gap-2 px-5 py-3 rounded-xl mb-4 text-md font-medium ${
                    isBeforeWindow
                        ? "bg-gray-100 text-gray-500 border border-gray-200"
                        : isOpen
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
            >
                <svg
                    className="w-4 h-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
                {message}
            </div>
        );
    };

    return (
        <div
            className={`flex flex-col transition-opacity duration-200 ${isDimmed ? "opacity-50 pointer-events-none" : ""}`}
        >
            <div className={isDimmed ? "pointer-events-none" : ""}>
                <WindowBanner />
            </div>

            {loadingExisting ? (
                <div className="text-sm text-gray-400 animate-pulse py-4">
                    Loading attendance data...
                </div>
            ) : !room ? (
                <p className="text-sm text-gray-400 italic py-4">
                    You have no {period.toLowerCase()} room assigned. Contact an
                    administrator.
                </p>
            ) : roomCompetitors.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-4">
                    No competitors found in Room {room}.
                </p>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                        {Object.keys(byTeam)
                            .sort()
                            .map((teamName) => (
                                <div
                                    key={teamName}
                                    className="bg-white rounded-xl border border-gray-300 shadow-md overflow-hidden"
                                >
                                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
                                        <h4
                                            className="font-semibold text-gray-700 truncate"
                                            title={teamName}
                                        >
                                            {teamName}
                                        </h4>
                                    </div>
                                    <div className="p-2 space-y-1">
                                        {byTeam[teamName].map((student) => {
                                            const isPresent = presentIds.has(
                                                student.id,
                                            );
                                            return (
                                                <button
                                                    key={student.id}
                                                    onClick={() =>
                                                        toggleAttendance(
                                                            student.id,
                                                        )
                                                    }
                                                    disabled={
                                                        isLocked || isDisabled
                                                    }
                                                    className={`
                                                    w-full text-left px-3 py-2 text-sm rounded-lg
                                                    flex justify-between items-center
                                                    transition-colors cursor-pointer
                                                    ${
                                                        isPresent
                                                            ? "hover:bg-green-50 hover:text-green-700"
                                                            : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                                                    }
                                                `}
                                                >
                                                    <span>{student.name}</span>
                                                    <span
                                                        className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${
                                                            isPresent
                                                                ? "text-green-600 bg-green-100 border-green-200"
                                                                : "text-red-500 bg-red-50 border-red-200"
                                                        }`}
                                                    >
                                                        {isPresent
                                                            ? "Present"
                                                            : "Absent"}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                    </div>

                    <div className="flex items-center justify-between">
                        <span
                            className={`text-sm font-medium ${status.startsWith("Error") ? "text-red-600" : "text-gray-600"}`}
                        >
                            {status}
                        </span>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={markAllPresent}
                                disabled={isLocked || isDisabled}
                                className="px-4 py-2.5 text-gray-600 font-medium border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Mark All Present
                            </button>
                            <button
                                onClick={submitAttendance}
                                disabled={isSaving || isLocked || isDisabled}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md shadow-blue-300 transition-all active:scale-95 cursor-pointer disabled:bg-blue-400 disabled:cursor-not-allowed"
                            >
                                {isSaving
                                    ? "Saving..."
                                    : hasExisting
                                      ? "Resubmit"
                                      : "Submit Attendance"}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Admin view ────────────────────────────────────────────────────────────────

function AdminAttendanceView({ competitors }: { competitors: Competitor[] }) {
    const [statusGrid, setStatusGrid] = useState<
        Record<
            string,
            Record<
                Period,
                {
                    submitted: boolean;
                    totalInRoom: number;
                    presentCount: number;
                }
            >
        >
    >({});
    const [loading, setLoading] = useState<boolean>(true);

    const rooms = useMemo(() => {
        const roomSet = new Set<string>();
        competitors.forEach((c) => {
            if (c.team?.room != null) roomSet.add(c.team.room.toString());
        });
        return Array.from(roomSet).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true }),
        );
    }, [competitors]);

    const competitorsByRoom = useMemo(() => {
        const map: Record<string, Competitor[]> = {};
        competitors.forEach((c) => {
            const r = c.team?.room?.toString();
            if (!r) return;
            if (!map[r]) map[r] = [];
            map[r].push(c);
        });
        return map;
    }, [competitors]);

    const fetchAdminStatus = useCallback(async () => {
        setLoading(true);
        const { data: logs, error } = await supabase
            .from("attendance_logs")
            .select("competitor_id, check_in_period");

        if (error) {
            console.error("Admin attendance fetch error:", error.message);
            setLoading(false);
            return;
        }

        const grid: Record<
            string,
            Record<
                Period,
                {
                    submitted: boolean;
                    totalInRoom: number;
                    presentCount: number;
                }
            >
        > = {};

        for (const room of rooms) {
            grid[room] = {} as any;
            const roomCompetitors = competitorsByRoom[room] ?? [];
            const roomIds = new Set(roomCompetitors.map((c) => c.id));

            for (const period of ["Morning", "Afternoon"] as Period[]) {
                const presentInRoom = new Set(
                    (logs ?? [])
                        .filter(
                            (l: any) =>
                                l.check_in_period === period &&
                                roomIds.has(l.competitor_id),
                        )
                        .map((l: any) => l.competitor_id),
                );
                grid[room][period] = {
                    submitted: presentInRoom.size > 0,
                    totalInRoom: roomCompetitors.length,
                    presentCount: presentInRoom.size,
                };
            }
        }

        setStatusGrid(grid);
        setLoading(false);
    }, [rooms, competitorsByRoom]);

    useEffect(() => {
        fetchAdminStatus();
    }, [fetchAdminStatus]);

    if (loading)
        return (
            <div className="text-sm text-gray-400 animate-pulse py-4">
                Loading attendance summary...
            </div>
        );

    const alerts: string[] = [];
    for (const room of rooms) {
        for (const period of ["Morning", "Afternoon"] as Period[]) {
            const s = statusGrid[room]?.[period];
            if (!s) continue;
            if (!s.submitted)
                alerts.push(`Room ${room} — ${period}: not yet submitted`);
            else if (s.totalInRoom - s.presentCount > 0)
                alerts.push(
                    `Room ${room} — ${period}: ${s.totalInRoom - s.presentCount} absent`,
                );
        }
    }

    const Cell = ({ room, period }: { room: string; period: Period }) => {
        const s = statusGrid[room]?.[period];
        if (!s) return <td className="px-4 py-3 text-gray-300 text-sm">—</td>;
        const missing = s.totalInRoom - s.presentCount;
        return (
            <td className="px-4 py-3">
                {!s.submitted ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                        Not submitted
                    </span>
                ) : missing > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                        {missing} absent
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        All present
                    </span>
                )}
            </td>
        );
    };

    return (
        <div className="space-y-4">
            {alerts.length > 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-2">
                        Attention Required
                    </p>
                    {alerts.map((a, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-2 text-sm text-amber-800"
                        >
                            <svg
                                className="w-4 h-4 shrink-0 text-amber-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                                />
                            </svg>
                            {a}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium text-green-700">
                    <svg
                        className="w-4 h-4 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                    All rooms have submitted attendance with no absences.
                </div>
            )}

            <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Room
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Morning
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Afternoon
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Competitors
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {rooms.map((room) => (
                            <tr
                                key={room}
                                className="hover:bg-gray-50 transition-colors"
                            >
                                <td className="px-4 py-3 font-medium text-gray-700">
                                    Room {room}
                                </td>
                                <Cell room={room} period="Morning" />
                                <Cell room={room} period="Afternoon" />
                                <td className="px-4 py-3 text-sm text-gray-500">
                                    {competitorsByRoom[room]?.length ?? 0}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={fetchAdminStatus}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 cursor-pointer"
                >
                    <svg
                        className="w-4 h-4"
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
                    Refresh
                </button>
            </div>
        </div>
    );
}

// ── Proctor view ──────────────────────────────────────────────────────────────

function ProctorAttendanceView({ competitors }: { competitors: Competitor[] }) {
    const [proctorRooms, setProctorRooms] = useState<ProctorRooms | null>(null);
    const [activeTab, setActiveTab] = useState<Period>("Morning");

    useEffect(() => {
        const fetchRooms = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session) return;
            const { data } = await supabase
                .from("user_roles")
                .select("morning_room, afternoon_room")
                .eq("id", session.user.id)
                .single();
            if (data) setProctorRooms(data as ProctorRooms);
        };
        fetchRooms();
    }, []);

    const tabs: { id: Period; label: string }[] = [
        { id: "Morning", label: "Morning" },
        { id: "Afternoon", label: "Afternoon" },
    ];

    return (
        <div className="flex flex-col gap-4">
            <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-full sm:w-max">
                {tabs.map((tab) => {
                    const status = getWindowStatus(tab.id);
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                                activeTab === tab.id
                                    ? "bg-white shadow text-blue-700"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                            }`}
                        >
                            {tab.label}
                            {status === "open" && (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                            )}
                        </button>
                    );
                })}
            </div>

            <AttendanceSubPanel
                period={activeTab}
                room={
                    proctorRooms?.[
                        activeTab === "Morning"
                            ? "morning_room"
                            : "afternoon_room"
                    ] ?? null
                }
                competitors={competitors}
            />
        </div>
    );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function AttendancePanel() {
    const { userRole } = useUser();
    const { competitors } = useTournamentData();

    return (
        <section className="bg-white shadow-lg border border-gray-300 rounded-2xl p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Attendance</h2>
            </div>
            {userRole === "admin" ? (
                <AdminAttendanceView competitors={competitors} />
            ) : (
                <ProctorAttendanceView competitors={competitors} />
            )}
        </section>
    );
}
