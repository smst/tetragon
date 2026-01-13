"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import GradingForm from "@/components/GradingForm";
import { useRouter } from "next/navigation";

export default function Home() {
    const router = useRouter();

    // USER STATES
    const [session, setSession] = useState(null);
    const [role, setRole] = useState(null); // 'admin', 'grader', or 'proctor'
    const [loadingAuth, setLoadingAuth] = useState(true);

    // DATA STATES
    const [competitors, setCompetitors] = useState([]);
    const [loadingScore, setLoadingScore] = useState(false);

    // 1. CHECK AUTH & ROLE ON LOAD
    useEffect(() => {
        const checkUser = async () => {
            // Get current logged-in user
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session) {
                router.push("/login"); // Kick out if not logged in
                return;
            }

            setSession(session);

            // Fetch the User's Role from the database
            const { data: roleData, error } = await supabase
                .from("user_roles")
                .select("role")
                .eq("id", session.user.id)
                .single();

            if (roleData) {
                setRole(roleData.role);
            } else {
                // Handle case where user exists but has no role assigned yet
                setRole("unassigned");
            }

            // If logged in, fetch the student list
            fetchData();
            setLoadingAuth(false);
        };

        checkUser();
    }, [router]);

    // 2. FETCH DATA FUNCTION
    const fetchData = async () => {
        const { data, error } = await supabase
            .from("competitors")
            .select("*")
            .order("math_round_score", { ascending: false }); // Sort by score (only Admins will see the score column)

        if (data) setCompetitors(data);
    };

    // 3. CALCULATION FUNCTION (Admin Only)
    const handleCalculate = async () => {
        setLoadingScore(true);
        try {
            const res = await fetch("/api/calculate-scores", {
                method: "POST",
            });
            if (!res.ok) throw new Error("Calculation failed");

            await fetchData(); // Refresh data
            alert("Scores recalculated successfully!");
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setLoadingScore(false);
        }
    };

    // 4. LOADING SCREEN (Prevents flashing)
    if (loadingAuth) {
        return (
            <div style={{ padding: "50px", textAlign: "center" }}>
                Loading SMST System...
            </div>
        );
    }

    // 5. THE DASHBOARD UI
    return (
        <main style={styles.container}>
            {/* HEADER */}
            <header style={styles.flexHeader}>
                <div>
                    <h1 style={{ margin: 0 }}>SMST Dashboard</h1>
                    <p style={{ color: "#666", marginTop: "5px" }}>
                        User: {session.user.email} <br />
                        Role:{" "}
                        <strong
                            style={{
                                color: "#0070f3",
                                textTransform: "capitalize",
                            }}
                        >
                            {role}
                        </strong>
                    </p>
                </div>
                <button
                    onClick={async () => {
                        await supabase.auth.signOut();
                        router.push("/login");
                    }}
                    style={styles.buttonLogout}
                >
                    Sign Out
                </button>
            </header>

            {/* --- VIEW FOR: ADMIN & GRADER (Grading Form) --- */}
            {(role === "admin" || role === "grader") && (
                <section style={styles.section}>
                    <GradingForm competitors={competitors} />
                </section>
            )}

            {/* --- VIEW FOR: PROCTOR (Attendance/List Only) --- */}
            {role === "proctor" && (
                <section style={styles.section}>
                    <div style={styles.card}>
                        <h3>Proctor Station</h3>
                        <p>
                            You have read-only access to the student list.
                            Please verify attendance.
                        </p>
                        {/* Simple list for proctors */}
                        <ul
                            style={{
                                maxHeight: "300px",
                                overflowY: "scroll",
                                border: "1px solid #eee",
                                padding: "10px",
                            }}
                        >
                            {competitors.map((c) => (
                                <li
                                    key={c.id}
                                    style={{
                                        padding: "5px 0",
                                        borderBottom: "1px solid #f9f9f9",
                                    }}
                                >
                                    {c.name}
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            )}

            <hr style={styles.divider} />

            {/* --- VIEW FOR: ADMIN ONLY (Scoreboard & Controls) --- */}
            {role === "admin" ? (
                <section style={styles.section}>
                    <div style={styles.flexHeader}>
                        <h2>Live Scoreboard</h2>
                        <button
                            onClick={handleCalculate}
                            disabled={loadingScore}
                            style={styles.buttonPrimary}
                        >
                            {loadingScore
                                ? "Running Algorithm..."
                                : "Recalculate Scores"}
                        </button>
                    </div>

                    <div style={styles.tableWrapper}>
                        <table style={styles.table}>
                            <thead>
                                <tr
                                    style={{
                                        backgroundColor: "#f4f4f4",
                                        textAlign: "left",
                                    }}
                                >
                                    <th style={styles.th}>Rank</th>
                                    <th style={styles.th}>Name</th>
                                    <th style={styles.th}>Math Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {competitors.map((c, index) => (
                                    <tr
                                        key={c.id}
                                        style={{
                                            borderBottom: "1px solid #eee",
                                        }}
                                    >
                                        <td style={styles.td}>#{index + 1}</td>
                                        <td style={styles.td}>{c.name}</td>
                                        <td
                                            style={{
                                                ...styles.td,
                                                fontWeight: "bold",
                                                color: "#2563EB",
                                            }}
                                        >
                                            {c.math_score
                                                ? Number(c.math_score).toFixed(
                                                      3
                                                  )
                                                : "0.000"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : (
                /* HIDE SCOREBOARD FOR NON-ADMINS */
                <div
                    style={{
                        textAlign: "center",
                        color: "#999",
                        marginTop: "50px",
                    }}
                >
                    <em>Scoreboard is hidden for this user level.</em>
                </div>
            )}
        </main>
    );
}

// --- STYLES ---
const styles = {
    container: {
        maxWidth: "900px",
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "sans-serif",
    },
    flexHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2rem",
    },
    section: { marginBottom: "3rem" },
    divider: {
        margin: "3rem 0",
        borderTop: "1px solid #ddd",
        borderBottom: "none",
    },

    buttonPrimary: {
        backgroundColor: "#0070f3",
        color: "white",
        padding: "10px 20px",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
        fontWeight: "bold",
    },
    buttonLogout: {
        backgroundColor: "#eee",
        color: "#333",
        padding: "8px 15px",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
    },

    card: {
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        backgroundColor: "#fafafa",
    },

    tableWrapper: {
        border: "1px solid #eaeaea",
        borderRadius: "8px",
        overflow: "hidden",
    },
    table: { width: "100%", borderCollapse: "collapse" },
    th: {
        padding: "12px 15px",
        fontSize: "0.9rem",
        fontWeight: "600",
        color: "#333",
        backgroundColor: "#f9f9f9",
    },
    td: { padding: "12px 15px", fontSize: "0.95rem" },
};
