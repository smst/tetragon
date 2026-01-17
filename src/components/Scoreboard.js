"use client";
import { useState, useMemo } from "react";

export default function Scoreboard({ competitors }) {
    const [sortConfig, setSortConfig] = useState({
        key: "total",
        direction: "desc",
    });

    const processedData = useMemo(() => {
        return competitors.map((c) => ({
            ...c,
            math: c.math_round_score || 0,
            science: c.science_round_score || 0,
            total: (c.math_round_score || 0) + (c.science_round_score || 0),
        }));
    }, [competitors]);

    const sortedCompetitors = useMemo(() => {
        let sorted = [...processedData];
        sorted.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === "asc" ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === "asc" ? 1 : -1;
            }
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

    return (
        <div className="flex flex-col">
            <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                    <div className="shadow-md overflow-hidden border border-gray-300 rounded-xl bg-white mb-100">
                        <table className="min-w-full border-collapse">
                            <thead className="bg-gray-100">
                                <tr className="border-b border-gray-300">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Rank
                                    </th>

                                    <th
                                        onClick={() => requestSort("name")}
                                        className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                    >
                                        <div className="flex items-center gap-1">
                                            Name
                                            <svg
                                                className={`w-3 h-3 transform transition-transform ${getClassNamesFor(
                                                    "name"
                                                )}`}
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

                                    <th
                                        onClick={() => requestSort("math")}
                                        className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                    >
                                        <div className="flex items-center gap-1">
                                            Math
                                            <svg
                                                className={`w-3 h-3 transform transition-transform ${getClassNamesFor(
                                                    "math"
                                                )}`}
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

                                    <th
                                        onClick={() => requestSort("science")}
                                        className="group px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                    >
                                        <div className="flex items-center gap-1">
                                            Science
                                            <svg
                                                className={`w-3 h-3 transform transition-transform ${getClassNamesFor(
                                                    "science"
                                                )}`}
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

                                    <th
                                        onClick={() => requestSort("total")}
                                        className="group px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none bg-gray-100"
                                    >
                                        <div className="flex items-center gap-1">
                                            Overall
                                            <svg
                                                className={`w-3 h-3 transform transition-transform ${getClassNamesFor(
                                                    "total"
                                                )}`}
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
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {sortedCompetitors.map((c, index) => (
                                    <tr
                                        key={c.id}
                                        className="border-b border-gray-200 hover:bg-blue-50 transition-colors last:border-0"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            #{index + 1}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {c.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {c.math.toFixed(3)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {c.science.toFixed(3)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700">
                                            {c.total.toFixed(3)}
                                        </td>
                                    </tr>
                                ))}
                                {sortedCompetitors.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan="5"
                                            className="px-6 py-4 text-center text-sm text-gray-500"
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
    );
}
