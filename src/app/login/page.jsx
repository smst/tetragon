"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="mb-8 relative group">
                <div className="rounded-full shadow-lg p-1 bg-white border border-gray-200">
                    <div className="rounded-full overflow-hidden h-30 w-30 flex items-center justify-center">
                        <Image
                            src="/logo.jpg"
                            alt="SMST Logo"
                            width={110}
                            height={110}
                            className="object-cover"
                            priority
                        />
                    </div>
                </div>
            </div>

            <form
                onSubmit={handleLogin}
                className="border border-gray-300 rounded-xl shadow-lg p-8 w-full max-w-sm bg-white"
            >
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">
                    SMST Staff Login
                </h2>

                {error && (
                    <div className="bg-red-200 border border-red-500 rounded-lg px-4 py-3 mb-6 text-red-500 text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="mb-6">
                    <label className="text-gray-900 font-bold text-md mb-1.5 block">
                        Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="volunteer@gmail.com"
                        className="px-3 py-2 border border-gray-300 rounded-md mx-auto w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="mb-8">
                    <label className="text-gray-900 font-bold text-md mb-1.5 block">
                        Password
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="px-3 py-2 border border-gray-300 rounded-md mx-auto w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="cursor-pointer w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Verifying..." : "Sign In"}
                </button>
            </form>
        </div>
    );
}
