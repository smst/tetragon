"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ConfirmPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Get the "next" destination (e.g., /reset-password)
    const next = searchParams.get("next") ?? "/";
    const [status, setStatus] = useState("Verifying invitation...");

    useEffect(() => {
        // The Supabase client (createBrowserClient) automatically detects
        // the hash tokens (#access_token=...) in the URL and sets the session.

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
                setStatus("Login successful! Redirecting...");
                // Cookies are now set. Redirect to the reset password page.
                router.replace(next);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [router, next]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900">
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h2 className="text-lg font-bold mb-2">{status}</h2>
                <p className="text-sm text-gray-500">
                    Please wait while we set up your account.
                </p>
            </div>
        </div>
    );
}
