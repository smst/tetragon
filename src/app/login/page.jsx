"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            // Login Successful: Redirect to the main dashboard
            router.push("/");
        }
    };

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "100px",
                fontFamily: "sans-serif",
            }}
        >
            <form
                onSubmit={handleLogin}
                style={{
                    border: "1px solid #ccc",
                    padding: "40px",
                    borderRadius: "8px",
                    width: "300px",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
            >
                <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
                    SMST Staff Login
                </h2>

                {error && (
                    <div
                        style={{
                            color: "red",
                            marginBottom: "15px",
                            fontSize: "0.9rem",
                            textAlign: "center",
                        }}
                    >
                        {error}
                    </div>
                )}

                <div style={{ marginBottom: "15px" }}>
                    <label
                        style={{
                            display: "block",
                            marginBottom: "5px",
                            fontSize: "0.9rem",
                            fontWeight: "bold",
                        }}
                    >
                        Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="volunteer@smst.org"
                        style={{
                            width: "100%",
                            padding: "10px",
                            borderRadius: "4px",
                            border: "1px solid #ddd",
                            boxSizing: "border-box",
                        }}
                    />
                </div>

                <div style={{ marginBottom: "25px" }}>
                    <label
                        style={{
                            display: "block",
                            marginBottom: "5px",
                            fontSize: "0.9rem",
                            fontWeight: "bold",
                        }}
                    >
                        Password
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{
                            width: "100%",
                            padding: "10px",
                            borderRadius: "4px",
                            border: "1px solid #ddd",
                            boxSizing: "border-box",
                        }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: "100%",
                        padding: "12px",
                        backgroundColor: "#0070f3",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: "bold",
                    }}
                >
                    {loading ? "Verifying..." : "Sign In"}
                </button>
            </form>
        </div>
    );
}
