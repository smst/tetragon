import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export default async function proxy(request) {
    // 1. Initialize Response
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    // 2. Initialize Supabase with cookie handling
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value),
                    );
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options),
                    );
                },
            },
        },
    );

    // 3. Check User Session
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // 4. Define Guardrails
    const isLoginPage = request.nextUrl.pathname.startsWith("/login");
    const isAuthRoute = request.nextUrl.pathname.startsWith("/auth");
    const isNextStatic = request.nextUrl.pathname.startsWith("/_next");
    const isStaticAsset = request.nextUrl.pathname.match(
        /\.(svg|png|jpg|jpeg|ico)$/,
    );

    // 5. Redirect Logic
    // Block access to dashboard if not logged in
    if (
        !user &&
        !isLoginPage &&
        !isAuthRoute &&
        !isNextStatic &&
        !isStaticAsset
    ) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Block access to login if already logged in
    if (user && isLoginPage) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
