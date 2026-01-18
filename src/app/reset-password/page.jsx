"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Update the user's password
        const { error } = await supabase.auth.updateUser({
            password: password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.push("/"); // Send them to dashboard
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="mb-8 rounded-full shadow-lg p-1 bg-white border border-gray-200">
                <div className="rounded-full overflow-hidden h-30 w-30 flex items-center justify-center">
                    <Image
                        src="/logo.jpg"
                        alt="Logo"
                        width={110}
                        height={110}
                        className="object-cover"
                        priority
                    />
                </div>
            </div>

            <form
                onSubmit={handleUpdate}
                className="border border-gray-300 rounded-xl shadow-lg p-8 w-full max-w-sm bg-white"
            >
                <h2 className="text-2xl font-bold mb-2 text-center text-gray-900">
                    Welcome!
                </h2>
                <p className="text-gray-500 text-center mb-6 text-sm">
                    Please set a password for your account.
                </p>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-4 text-center">
                        {error}
                    </div>
                )}

                <div className="mb-6">
                    <label className="text-gray-900 font-bold text-md mb-1.5 block">
                        New Password
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="px-3 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="cursor-pointer w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md transition-colors"
                >
                    {loading ? "Setting Password..." : "Set Password & Login"}
                </button>
            </form>
        </div>
    );
}
