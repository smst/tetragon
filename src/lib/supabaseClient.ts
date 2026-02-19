import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Using createBrowserClient ensures SWR automatically inherits the user's auth cookies
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
