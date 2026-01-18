"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// 1. The inner component that handles the logic
function ConfirmContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next") ?? "/";
    const [status, setStatus] = useState("Verifying invitation...");

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
                setStatus("Login successful! Redirecting...");
                router.replace(next);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [router, next]);

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-lg font-bold mb-2">{status}</h2>
            <p className="text-sm text-gray-500">
                Please wait while we set up your account.
            </p>
        </div>
    );
}

// 2. The main page component that wraps it in Suspense
export default function ConfirmPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900">
            <Suspense
                fallback={
                    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 mx-auto mb-4"></div>
                        <h2 className="text-lg font-bold mb-2">Loading...</h2>
                    </div>
                }
            >
                <ConfirmContent />
            </Suspense>
        </div>
    );
}
