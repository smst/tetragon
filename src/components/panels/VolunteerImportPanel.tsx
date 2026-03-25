"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface ParsedVolunteer {
    email: string;
    name: string;
    morningRoom: string;
    afternoonRoom: string;
    raw: string[];
}

export default function VolunteerImportPanel() {
    const [stagedData, setStagedData] = useState<ParsedVolunteer[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{
        type: "success" | "error" | "";
        text: string;
    }>({ type: "", text: "" });
    const [importErrors, setImportErrors] = useState<string[]>([]);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setStatusMessage({ type: "", text: "" });
        setImportErrors([]);

        const file = e.target.files?.[0];
        if (!file) return;

        const text = await file.text();
        const lines = text.split("\n").filter((line) => line.trim() !== "");

        if (lines.length < 2) return;

        const headers = lines[0].split("\t").map((h) => h.trim().toLowerCase());

        const emailIdx = headers.findIndex((h) => h.includes("email"));
        const nameIdx = headers.findIndex(
            (h) => h.includes("name") || h.includes("proctor"),
        );
        const amIdx = headers.findIndex((h) => h.includes("morning"));
        const pmIdx = headers.findIndex((h) => h.includes("afternoon"));

        if (emailIdx === -1) {
            setStatusMessage({
                type: "error",
                text: "Could not locate an email column. Check your TSV headers.",
            });
            return;
        }

        const parsed: ParsedVolunteer[] = [];

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split("\t");

            const email = row[emailIdx]?.trim();
            const name = nameIdx !== -1 ? row[nameIdx]?.trim() : "";
            const am = amIdx !== -1 ? row[amIdx]?.trim() : "";
            const pm = pmIdx !== -1 ? row[pmIdx]?.trim() : "";

            if (
                !email ||
                email.toUpperCase() === "FALSE" ||
                email.toUpperCase() === "TRUE"
            ) {
                continue;
            }

            parsed.push({
                email,
                name,
                morningRoom: am,
                afternoonRoom: pm,
                raw: row,
            });
        }

        setStagedData(parsed);
    };

    const handleCellChange = (
        index: number,
        field: keyof ParsedVolunteer,
        value: string,
    ) => {
        const newData = [...stagedData];
        newData[index] = { ...newData[index], [field]: value };
        setStagedData(newData);
    };

    const handleImport = async () => {
        setShowConfirm(false);
        setIsImporting(true);
        setStatusMessage({ type: "", text: "" });
        setImportErrors([]);

        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            setStatusMessage({
                type: "error",
                text: "Authentication error. Please sign in again.",
            });
            setIsImporting(false);
            return;
        }

        try {
            const res = await fetch("/api/admin/volunteers/import", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ volunteers: stagedData }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to import volunteers.");
            }

            if (data.errors && data.errors.length > 0) {
                setImportErrors(data.errors);
                setStatusMessage({
                    type: "success",
                    text: `Import completed with ${data.errors.length} errors. Added/updated ${data.importedCount} proctors.`,
                });
            } else {
                setStagedData([]);
                setStatusMessage({
                    type: "success",
                    text: `Import completely successful! Added/updated ${data.importedCount} proctors.`,
                });
            }
        } catch (err: any) {
            setStatusMessage({
                type: "error",
                text: `Error during import: ${err.message || "Unknown network error."}`,
            });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="relative">
            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl px-4 py-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Upload Proctor TSV File
                </label>
                <input
                    type="file"
                    accept=".tsv"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:border-blue-300 file:transition-colors cursor-pointer file:cursor-pointer"
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

            {importErrors.length > 0 && (
                <div className="mb-6 border border-red-200 rounded-xl bg-red-50 overflow-hidden">
                    <div className="px-4 py-2 bg-red-100 text-red-800 font-bold text-sm border-b border-red-200">
                        Import Errors Log
                    </div>
                    <ul className="px-4 py-3 text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto font-mono">
                        {importErrors.map((err, i) => (
                            <li key={i}>{err}</li>
                        ))}
                    </ul>
                </div>
            )}

            {stagedData.length > 0 && (
                <div className="space-y-4">
                    <div className="shadow-md rounded-xl">
                        <div className="border border-gray-300 rounded-xl overflow-x-auto max-h-150">
                            <table className="min-w-full border-collapse">
                                <thead className="bg-gray-100 sticky top-0 z-10">
                                    <tr className="border-b border-gray-300">
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Email Address
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Proctor Name
                                        </th>
                                        <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            AM Room
                                        </th>
                                        <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            PM Room
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {stagedData.map((row, i) => (
                                        <tr
                                            key={i}
                                            className="border-b border-gray-200 hover:bg-gray-50 transition-colors last:border-0"
                                        >
                                            <td className="px-6 py-3 whitespace-nowrap">
                                                <input
                                                    type="email"
                                                    value={row.email}
                                                    onChange={(e) =>
                                                        handleCellChange(
                                                            i,
                                                            "email",
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white"
                                                />
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap">
                                                <input
                                                    type="text"
                                                    value={row.name}
                                                    onChange={(e) =>
                                                        handleCellChange(
                                                            i,
                                                            "name",
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white"
                                                />
                                            </td>
                                            <td className="w-32 px-6 py-3 whitespace-nowrap">
                                                <input
                                                    type="text"
                                                    value={row.morningRoom}
                                                    onChange={(e) =>
                                                        handleCellChange(
                                                            i,
                                                            "morningRoom",
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white"
                                                />
                                            </td>
                                            <td className="w-32 px-6 py-3 whitespace-nowrap">
                                                <input
                                                    type="text"
                                                    value={row.afternoonRoom}
                                                    onChange={(e) =>
                                                        handleCellChange(
                                                            i,
                                                            "afternoonRoom",
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-4">
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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    Confirm Proctor Import
                                </h3>
                                <p className="text-sm text-gray-500">
                                    This will create {stagedData.length}{" "}
                                    accounts and send welcome emails.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="text-gray-400 hover:text-gray-600 cursor-pointer"
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

                        <div className="p-6 overflow-y-auto flex-1 bg-gray-50 space-y-3">
                            {stagedData.map((v, idx) => (
                                <div
                                    key={idx}
                                    className="bg-white border border-gray-200 rounded-xl p-3 flex justify-between items-center shadow-sm"
                                >
                                    <div>
                                        <div className="font-semibold text-sm text-gray-900">
                                            {v.name || (
                                                <span className="italic text-gray-400">
                                                    Unnamed
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {v.email}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {v.morningRoom ? (
                                            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-md">
                                                AM: {v.morningRoom}
                                            </span>
                                        ) : (
                                            <span className="text-xs bg-gray-50 text-gray-400 border border-gray-200 px-2 py-1 rounded-md">
                                                No AM
                                            </span>
                                        )}
                                        {v.afternoonRoom ? (
                                            <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded-md">
                                                PM: {v.afternoonRoom}
                                            </span>
                                        ) : (
                                            <span className="text-xs bg-gray-50 text-gray-400 border border-gray-200 px-2 py-1 rounded-md">
                                                No PM
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-5 py-2.5 text-gray-600 font-medium border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={isImporting}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md shadow-blue-300 transition-all active:scale-95 cursor-pointer disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isImporting
                                    ? "Processing Emails..."
                                    : "Dispatch Invites"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
