"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { UserRole } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StaffMember {
    id: string;
    email: string;
    role: UserRole;
    last_sign_in: string | null;
    morning_room: number | null;
    afternoon_room: number | null;
}

type ModalType = "delete" | "role" | "invite" | "rooms" | null;
type ViewTab = "committee" | "proctors" | "unassigned";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLastSeen(raw: string | null): string {
    if (!raw) return "Never";
    const date = new Date(raw);
    if (isNaN(date.getTime())) return "Never";
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function getActivityStatus(
    raw: string | null,
): "today" | "recent" | "old" | "never" {
    if (!raw) return "never";
    const date = new Date(raw);
    if (isNaN(date.getTime())) return "never";
    const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 1) return "today";
    if (diffDays < 7) return "recent";
    return "old";
}

const ACTIVITY_STYLES = {
    today: {
        dot: "bg-green-500",
        text: "text-green-700",
        label: "Active today",
    },
    recent: {
        dot: "bg-yellow-400",
        text: "text-yellow-700",
        label: "Active recently",
    },
    old: { dot: "bg-gray-300", text: "text-gray-500", label: "" },
    never: {
        dot: "bg-gray-200",
        text: "text-gray-400",
        label: "Never signed in",
    },
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
    { value: "proctor", label: "Proctor" },
    { value: "grader", label: "Grader" },
    { value: "admin", label: "Admin" },
];

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
    const styles: Record<UserRole, string> = {
        admin: "text-purple-700 bg-purple-50 border-purple-200",
        grader: "text-blue-700   bg-blue-50   border-blue-200",
        proctor: "text-green-700  bg-green-50  border-green-200",
        unassigned: "text-gray-500   bg-gray-50   border-gray-200",
    };
    return (
        <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${styles[role] ?? styles.unassigned}`}
        >
            {role}
        </span>
    );
}

// ── Room badge ────────────────────────────────────────────────────────────────

function RoomBadge({ label, room }: { label: string; room: number | null }) {
    return (
        <span className="text-xs text-gray-500">
            <span className="font-medium text-gray-600">{label}:</span>{" "}
            {room ?? <span className="italic text-gray-400">unassigned</span>}
        </span>
    );
}

// ── Manage dropdown ───────────────────────────────────────────────────────────
// Defined OUTSIDE the main component so React never recreates it on re-render,
// which would reset useState and break open/close state.

interface ManageMenuProps {
    user: StaffMember;
    isProctor: boolean;
    onRole: (user: StaffMember) => void;
    onRooms: (user: StaffMember) => void;
    onResend: (user: StaffMember) => void;
    onDelete: (user: StaffMember) => void;
}

function ManageMenu({
    user,
    isProctor,
    onRole,
    onRooms,
    onResend,
    onDelete,
}: ManageMenuProps) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, right: 0 });
    const wrapperRef = useRef<HTMLDivElement>(null);
    const lastEventRef = useRef<number>(0);

    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        const handleScroll = () => setOpen(false);

        document.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("scroll", handleScroll, true); // capture: true catches all scroll events
        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, []);

    const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
        // Guard against double-firing (happens when ManageMenu is accidentally
        // rendered twice in the tree — two instances both respond to the same click)
        if (e.timeStamp === lastEventRef.current) return;
        lastEventRef.current = e.timeStamp;

        const rect = e.currentTarget.getBoundingClientRect();
        setPos({
            top: rect.bottom + 4,
            right: window.innerWidth - rect.right,
        });
        setOpen((p) => !p);
    };

    const item = (label: string, onClick: () => void, danger = false) => (
        <button
            key={label}
            onMouseDown={(e) => {
                e.stopPropagation();
                onClick();
                setOpen(false);
            }}
            className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer ${
                danger
                    ? "text-red-600 hover:bg-red-50"
                    : "text-gray-700 hover:bg-gray-50"
            }`}
        >
            {label}
        </button>
    );

    return (
        <div ref={wrapperRef} className="inline-block">
            <button
                onClick={handleOpen}
                className="px-4 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
                Manage
                <svg
                    className="w-3.5 h-3.5 text-gray-400"
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

            {open &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        style={{
                            position: "fixed",
                            top: pos.top,
                            right: pos.right,
                            zIndex: 9999,
                        }}
                        className="w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                    >
                        {item("Change Role", () => onRole(user))}
                        {isProctor && item("Assign Rooms", () => onRooms(user))}
                        {item("Resend Invite", () => onResend(user))}
                        <div className="border-t border-gray-100" />
                        {item("Remove Access", () => onDelete(user), true)}
                    </div>,
                    document.body,
                )}
        </div>
    );
}

// ── User table ────────────────────────────────────────────────────────────────
// Also defined OUTSIDE to avoid remounting ManageMenu on every parent re-render.

interface UserTableProps {
    list: StaffMember[];
    showRooms: boolean;
    onRole: (user: StaffMember) => void;
    onRooms: (user: StaffMember) => void;
    onResend: (user: StaffMember) => void;
    onDelete: (user: StaffMember) => void;
}

function UserTable({
    list,
    showRooms,
    onRole,
    onRooms,
    onResend,
    onDelete,
}: UserTableProps) {
    return (
        <div className="shadow-md rounded-xl">
            <div className="border border-gray-300 rounded-xl overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead className="bg-gray-100">
                        <tr className="border-b border-gray-300">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-72">
                                User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                                Last Active
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                            </th>
                            {showRooms && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Rooms
                                </th>
                            )}
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {list.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={showRooms ? 5 : 4}
                                    className="px-6 py-8 text-center text-sm text-gray-400 italic"
                                >
                                    No users in this group.
                                </td>
                            </tr>
                        ) : (
                            list.map((user) => {
                                const activity = getActivityStatus(
                                    user.last_sign_in,
                                );
                                const { dot, text, label } =
                                    ACTIVITY_STYLES[activity];
                                return (
                                    <tr
                                        key={user.id}
                                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors last:border-0"
                                    >
                                        <td className="px-6 py-4 w-72 max-w-72">
                                            <div className="text-sm font-medium text-gray-900 truncate">
                                                {user.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`w-2 h-2 rounded-full shrink-0 ${dot}`}
                                                />
                                                <div>
                                                    <div
                                                        className={`text-xs font-medium ${text}`}
                                                    >
                                                        {label ||
                                                            formatLastSeen(
                                                                user.last_sign_in,
                                                            )}
                                                    </div>
                                                    {label &&
                                                        activity !==
                                                            "never" && (
                                                            <div className="text-xs text-gray-400">
                                                                {formatLastSeen(
                                                                    user.last_sign_in,
                                                                )}
                                                            </div>
                                                        )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <RoleBadge role={user.role} />
                                        </td>
                                        {showRooms && (
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-0.5">
                                                    <RoomBadge
                                                        label="AM"
                                                        room={user.morning_room}
                                                    />
                                                    <RoomBadge
                                                        label="PM"
                                                        room={
                                                            user.afternoon_room
                                                        }
                                                    />
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <ManageMenu
                                                user={user}
                                                isProctor={
                                                    user.role === "proctor"
                                                }
                                                onRole={onRole}
                                                onRooms={onRooms}
                                                onResend={onResend}
                                                onDelete={onDelete}
                                            />
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UserManagementPanel() {
    const [users, setUsers] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [activeTab, setActiveTab] = useState<ViewTab>("committee");

    const [modalType, setModalType] = useState<ModalType>(null);
    const [targetUser, setTargetUser] = useState<StaffMember | null>(null);
    const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
    const [inviteEmail, setInviteEmail] = useState<string>("");
    const [morningRoom, setMorningRoom] = useState<string>("");
    const [afternoonRoom, setAfternoonRoom] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [modalStatus, setModalStatus] = useState<string>("");

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const {
            data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;
        try {
            const res = await fetch("/api/admin/users", {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) throw new Error("Failed to fetch users");
            const data = await res.json();
            setUsers(data.users);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const committeeUsers = users.filter(
        (u) => u.role === "admin" || u.role === "grader",
    );
    const proctorUsers = users.filter((u) => u.role === "proctor");
    const unassignedUsers = users.filter((u) => u.role === "unassigned");

    useEffect(() => {
        // Auto-switch away if the unassigned tab becomes empty while viewing it
        if (
            activeTab === "unassigned" &&
            unassignedUsers.length === 0 &&
            users.length > 0
        ) {
            setActiveTab("committee");
        }
    }, [users, activeTab, unassignedUsers.length]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const openInvite = () => {
        setInviteEmail("");
        setModalStatus("");
        setModalType("invite");
    };

    const confirmInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        setModalStatus("");
        const {
            data: { session },
        } = await supabase.auth.getSession();
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session!.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: inviteEmail }),
            });
            if (!res.ok) {
                const e = await res.json();
                throw new Error(e.error || "Failed to invite user");
            }
            setModalStatus("Invite sent successfully!");
            await fetchUsers();
            setTimeout(closeModal, 1200);
        } catch (err: unknown) {
            setModalStatus(
                "Error: " +
                    (err instanceof Error ? err.message : "Unknown error"),
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const openRole = (user: StaffMember) => {
        setTargetUser(user);
        setPendingRole(user.role);
        setModalStatus("");
        setModalType("role");
    };

    const confirmRoleChange = async () => {
        setIsProcessing(true);
        const {
            data: { session },
        } = await supabase.auth.getSession();
        const res = await fetch("/api/admin/users", {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${session!.access_token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userId: targetUser!.id,
                newRole: pendingRole,
            }),
        });
        if (res.ok) {
            setUsers(
                users.map((u) =>
                    u.id === targetUser!.id ? { ...u, role: pendingRole! } : u,
                ),
            );
            closeModal();
        } else {
            setModalStatus("Error: Failed to update role.");
            setIsProcessing(false);
        }
    };

    const openRooms = (user: StaffMember) => {
        setTargetUser(user);
        setMorningRoom(user.morning_room?.toString() ?? "");
        setAfternoonRoom(user.afternoon_room?.toString() ?? "");
        setModalStatus("");
        setModalType("rooms");
    };

    const confirmRooms = async () => {
        setIsProcessing(true);
        const {
            data: { session },
        } = await supabase.auth.getSession();
        const res = await fetch("/api/admin/users", {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${session!.access_token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userId: targetUser!.id,
                morning_room: morningRoom ? parseInt(morningRoom) : null,
                afternoon_room: afternoonRoom ? parseInt(afternoonRoom) : null,
            }),
        });
        if (res.ok) {
            setUsers(
                users.map((u) =>
                    u.id === targetUser!.id
                        ? {
                              ...u,
                              morning_room: morningRoom
                                  ? parseInt(morningRoom)
                                  : null,
                              afternoon_room: afternoonRoom
                                  ? parseInt(afternoonRoom)
                                  : null,
                          }
                        : u,
                ),
            );
            closeModal();
        } else {
            setModalStatus("Error: Failed to save rooms.");
            setIsProcessing(false);
        }
    };

    const openDelete = (user: StaffMember) => {
        setTargetUser(user);
        setModalStatus("");
        setModalType("delete");
    };

    const confirmDelete = async () => {
        setIsProcessing(true);
        const {
            data: { session },
        } = await supabase.auth.getSession();
        const res = await fetch("/api/admin/users", {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${session!.access_token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId: targetUser!.id }),
        });
        if (res.ok) {
            setUsers(users.filter((u) => u.id !== targetUser!.id));
            closeModal();
        } else {
            setModalStatus("Error: Failed to remove user.");
            setIsProcessing(false);
        }
    };

    const handleResend = async (user: StaffMember) => {
        const {
            data: { session },
        } = await supabase.auth.getSession();
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session!.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: user.email, resend: true }),
            });
            if (!res.ok) throw new Error();
            alert(`Invite resent to ${user.email}`);
        } catch {
            alert("Failed to resend invite.");
        }
    };

    const closeModal = () => {
        setModalType(null);
        setTargetUser(null);
        setPendingRole(null);
        setInviteEmail("");
        setMorningRoom("");
        setAfternoonRoom("");
        setIsProcessing(false);
        setModalStatus("");
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading)
        return (
            <div className="p-4 text-gray-500 text-center animate-pulse">
                Loading users...
            </div>
        );

    const tabs: { id: ViewTab; label: string; count: number }[] = [
        { id: "committee", label: "Committee", count: committeeUsers.length },
        { id: "proctors", label: "Proctors", count: proctorUsers.length },
    ];

    // Conditionally inject the Unassigned tab
    if (unassignedUsers.length > 0) {
        tabs.push({
            id: "unassigned",
            label: "Unassigned",
            count: unassignedUsers.length,
        });
    }

    return (
        <section className="bg-white shadow-lg border border-gray-300 rounded-2xl p-8">
            <div className="flex flex-col gap-4 mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                    User Management
                </h2>
                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-max overflow-x-auto">
                    {tabs.map((tab) => (
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
                            <span
                                className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                                    activeTab === tab.id
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-gray-200 text-gray-500"
                                }`}
                            >
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === "committee" && (
                <UserTable
                    list={committeeUsers}
                    showRooms={false}
                    onRole={openRole}
                    onRooms={openRooms}
                    onResend={handleResend}
                    onDelete={openDelete}
                />
            )}
            {activeTab === "proctors" && (
                <UserTable
                    list={proctorUsers}
                    showRooms={true}
                    onRole={openRole}
                    onRooms={openRooms}
                    onResend={handleResend}
                    onDelete={openDelete}
                />
            )}
            {activeTab === "unassigned" && (
                <UserTable
                    list={unassignedUsers}
                    showRooms={false}
                    onRole={openRole}
                    onRooms={openRooms}
                    onResend={handleResend}
                    onDelete={openDelete}
                />
            )}

            <div className="mt-5 flex justify-end">
                <button
                    onClick={openInvite}
                    className="px-6 py-2.5 shadow-md shadow-blue-300 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all active:scale-95 cursor-pointer text-sm"
                >
                    + Create New User
                </button>
            </div>

            {/* ── Modals ── */}
            {modalType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        {/* INVITE */}
                        {modalType === "invite" && (
                            <>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">
                                    Create New User
                                </h3>
                                <p className="text-sm text-gray-500 mb-5">
                                    They'll receive an email to set their
                                    password. Their role will be{" "}
                                    <span className="font-medium">
                                        Unassigned
                                    </span>{" "}
                                    until updated.
                                </p>
                                <form onSubmit={confirmInvite}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={inviteEmail}
                                        onChange={(e) =>
                                            setInviteEmail(e.target.value)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 mb-5 text-sm"
                                        placeholder="colleague@example.com"
                                    />
                                    {modalStatus && (
                                        <p
                                            className={`text-sm mb-4 font-medium ${modalStatus.startsWith("Error") ? "text-red-600" : "text-green-600"}`}
                                        >
                                            {modalStatus}
                                        </p>
                                    )}
                                    <div className="flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={closeModal}
                                            disabled={isProcessing}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isProcessing}
                                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-60"
                                        >
                                            {isProcessing
                                                ? "Sending..."
                                                : "Send Invite"}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}

                        {/* CHANGE ROLE */}
                        {modalType === "role" && (
                            <>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">
                                    Change Role
                                </h3>
                                <p className="text-sm text-gray-500 mb-5">
                                    Updating role for{" "}
                                    <span className="font-medium text-gray-800">
                                        {targetUser?.email}
                                    </span>
                                </p>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    New Role
                                </label>
                                <select
                                    value={pendingRole ?? ""}
                                    onChange={(e) =>
                                        setPendingRole(
                                            e.target.value as UserRole,
                                        )
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 mb-5 text-sm cursor-pointer"
                                >
                                    {ROLE_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                                {modalStatus && (
                                    <p className="text-sm mb-4 font-medium text-red-600">
                                        {modalStatus}
                                    </p>
                                )}
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={closeModal}
                                        disabled={isProcessing}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmRoleChange}
                                        disabled={
                                            isProcessing ||
                                            pendingRole === targetUser?.role
                                        }
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-60"
                                    >
                                        {isProcessing ? "Saving..." : "Save"}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ASSIGN ROOMS */}
                        {modalType === "rooms" && (
                            <>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">
                                    Assign Rooms
                                </h3>
                                <p className="text-sm text-gray-500 mb-5">
                                    Room assignments for{" "}
                                    <span className="font-medium text-gray-800">
                                        {targetUser?.email}
                                    </span>
                                </p>
                                <div className="space-y-4 mb-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Morning Room
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={morningRoom}
                                            onChange={(e) =>
                                                setMorningRoom(e.target.value)
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            placeholder="e.g. 101"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Afternoon Room
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={afternoonRoom}
                                            onChange={(e) =>
                                                setAfternoonRoom(e.target.value)
                                            }
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            placeholder="e.g. 204"
                                        />
                                    </div>
                                </div>
                                {modalStatus && (
                                    <p className="text-sm mb-4 font-medium text-red-600">
                                        {modalStatus}
                                    </p>
                                )}
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={closeModal}
                                        disabled={isProcessing}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmRooms}
                                        disabled={isProcessing}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-60"
                                    >
                                        {isProcessing ? "Saving..." : "Save"}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* DELETE */}
                        {modalType === "delete" && (
                            <>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">
                                    Remove Access
                                </h3>
                                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                                    Are you sure you want to permanently remove{" "}
                                    <span className="font-semibold">
                                        {targetUser?.email}
                                    </span>
                                    ? This cannot be undone.
                                </p>
                                {modalStatus && (
                                    <p className="text-sm mb-4 font-medium text-red-600">
                                        {modalStatus}
                                    </p>
                                )}
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={closeModal}
                                        disabled={isProcessing}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        disabled={isProcessing}
                                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-60"
                                    >
                                        {isProcessing
                                            ? "Removing..."
                                            : "Remove"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
