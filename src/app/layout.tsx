import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import Footer from "@/components/dashboard/Footer";

const manrope = Manrope({
    subsets: ["latin"],
    variable: "--font-manrope",
});

export const metadata: Metadata = {
    title: "Tetragon | SMST",
    description:
        "Tournament management system for the Sharon Math and Science Tournament",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${manrope.variable}`}>
            <body className="antialiased text-gray-900 bg-white flex flex-col min-h-screen">
                <div className="grow">{children}</div>
                <Footer />
            </body>
        </html>
    );
}
