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
        const handleAuth = async () => {
            // 1. Check if Supabase already grabbed the session
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (session) {
                setStatus("Session found. Redirecting...");
                router.replace(next);
                return;
            }

            // 2. Fallback: Manually parse the URL hash
            // This forces the login if the automatic detector fails
            const hash = window.location.hash;
            if (hash && hash.includes("access_token")) {
                try {
                    // Remove the '#' character and parse parameters
                    const params = new URLSearchParams(hash.substring(1));
                    const access_token = params.get("access_token");
                    const refresh_token = params.get("refresh_token");

                    if (access_token && refresh_token) {
                        setStatus("Verifying token...");

                        // Manually set the session using the tokens from the URL
                        const { error } = await supabase.auth.setSession({
                            access_token,
                            refresh_token,
                        });

                        if (!error) {
                            setStatus("Success! Redirecting...");
                            router.replace(next);
                            return;
                        } else {
                            setStatus("Error: " + error.message);
                        }
                    }
                } catch (err) {
                    console.error("Hash parsing error:", err);
                    setStatus("Error parsing link.");
                }
            }
        };

        handleAuth();

        // 3. Keep the listener as a backup
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
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
