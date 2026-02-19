"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { UserRole } from "@/types";

interface StaffMember {
    id: string;
    email: string;
    role: UserRole;
    last_sign_in: string | null;
}

type ModalType = "delete" | "role" | "invite" | null;

export default function StaffManagementPanel() {
    const [users, setUsers] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // -- Modals State --
    const [modalType, setModalType] = useState<ModalType>(null);
    const [targetUser, setTargetUser] = useState<StaffMember | null>(null);
    const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
    const [inviteEmail, setInviteEmail] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

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

    // --- HANDLERS ---
    const initiateInvite = () => {
        setInviteEmail("");
        setModalType("invite");
    };

    const confirmInvite = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsProcessing(true);
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
                const err = await res.json();
                throw new Error(err.error || "Failed to invite user");
            }

            alert("Invitation sent successfully!");
            await fetchUsers();
            closeModal();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsProcessing(false);
        }
    };

    const initiateRoleChange = (user: StaffMember, newRole: UserRole) => {
        setTargetUser(user);
        setPendingRole(newRole);
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
            alert("Failed to update role");
            setIsProcessing(false);
        }
    };

    const initiateDelete = (user: StaffMember) => {
        setTargetUser(user);
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
            alert("Failed to delete user");
            setIsProcessing(false);
        }
    };

    const closeModal = () => {
        setModalType(null);
        setTargetUser(null);
        setPendingRole(null);
        setInviteEmail("");
        setIsProcessing(false);
    };

    if (loading)
        return (
            <div className="p-4 text-gray-500 text-center animate-pulse">
                Loading directory...
            </div>
        );

    return (
        <section className="bg-white shadow-lg border border-gray-300 rounded-2xl p-8">
            {" "}
            <div className="overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
                        Staff Management
                    </h2>
                    <button
                        onClick={initiateInvite}
                        className="px-8 py-2.5 shadow-md shadow-blue-300 bg-blue-600 hover:bg-blue-700 text-md text-white font-medium rounded-xl transition-all active:scale-95 cursor-pointer"
                    >
                        Create New User
                    </button>
                </div>

                <div className="shadow-md border border-gray-300 rounded-xl overflow-hidden mb-5">
                    <table className="min-w-full border-collapse">
                        <thead className="bg-gray-100">
                            <tr className="border-b border-gray-300">
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {users.map((user) => (
                                <tr
                                    key={user.id}
                                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors last:border-0"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {user.email}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Last login:{" "}
                                            {user.last_sign_in
                                                ? new Date(
                                                      user.last_sign_in,
                                                  ).toLocaleDateString()
                                                : "Never"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <select
                                            value={user.role}
                                            onChange={(e) =>
                                                initiateRoleChange(
                                                    user,
                                                    e.target.value as UserRole,
                                                )
                                            }
                                            className="cursor-pointer block w-full max-w-35 py-1.5 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        >
                                            <option value="unassigned">
                                                Unassigned
                                            </option>
                                            <option value="proctor">
                                                Proctor
                                            </option>
                                            <option value="grader">
                                                Grader
                                            </option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => initiateDelete(user)}
                                            className="border border-red-300 px-4 py-1.5 rounded-lg shadow-md text-sm font-medium bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800 transition-all cursor-pointer active:scale-90"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* --- MODAL --- */}
            {modalType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {modalType === "delete" && "Remove Staff Member?"}
                            {modalType === "role" && "Change User Role?"}
                            {modalType === "invite" && "Invite New Proctor"}
                        </h3>

                        {/* INVITE FORM CONTENT */}
                        {modalType === "invite" && (
                            <form onSubmit={confirmInvite}>
                                <div className="mb-6">
                                    <p className="text-sm text-gray-600 mb-4">
                                        Enter the email address of the new
                                        proctor. They will receive an email with
                                        a link to set their password.
                                    </p>
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="colleague@example.com"
                                    />
                                </div>
                                <div className="flex justify-end space-x-3">
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
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
                                    >
                                        {isProcessing
                                            ? "Sending..."
                                            : "Send Invite"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* DELETE/ROLE CONTENT */}
                        {modalType !== "invite" && (
                            <>
                                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                                    {modalType === "delete" ? (
                                        <>
                                            Are you sure you want to permanently
                                            delete{" "}
                                            <strong>{targetUser?.email}</strong>
                                            ? This cannot be undone.
                                        </>
                                    ) : (
                                        <>
                                            Are you sure you want to change{" "}
                                            <strong>{targetUser?.email}</strong>{" "}
                                            from{" "}
                                            <span className="capitalize font-bold">
                                                {targetUser?.role}
                                            </span>{" "}
                                            to{" "}
                                            <span className="capitalize font-bold">
                                                {pendingRole}
                                            </span>
                                            ?
                                        </>
                                    )}
                                </p>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={closeModal}
                                        disabled={isProcessing}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={
                                            modalType === "delete"
                                                ? confirmDelete
                                                : confirmRoleChange
                                        }
                                        disabled={isProcessing}
                                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm cursor-pointer ${
                                            modalType === "delete"
                                                ? "bg-red-600 hover:bg-red-700"
                                                : "bg-blue-600 hover:bg-blue-700"
                                        }`}
                                    >
                                        {isProcessing
                                            ? "Processing..."
                                            : "Confirm"}
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
