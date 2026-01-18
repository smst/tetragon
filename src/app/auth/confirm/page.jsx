"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function ConfirmContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next") ?? "/";
    const [status, setStatus] = useState("Verifying invitation...");

    useEffect(() => {
        // 1. Define the success handler to avoid duplication
        const handleSuccess = () => {
            setStatus("Login successful! Redirecting...");
            router.replace(next);
        };

        // 2. Check immediately: Did Supabase already process the hash?
        const checkSession = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (session) {
                handleSuccess();
            }
        };
        checkSession();

        // 3. Listen for events: In case it happens slightly later
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (
                event === "SIGNED_IN" ||
                event === "TOKEN_REFRESHED" ||
                event === "PASSWORD_RECOVERY"
            ) {
                handleSuccess();
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
