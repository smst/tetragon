import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
    subsets: ["latin"],
    variable: "--font-manrope",
});

export const metadata = {
    title: "Tetragon | SMST",
    description:
        "Tournament management system for the Sharon Math and Science Tournament",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" className={`${manrope.variable}`}>
            <body className="font-sans antialiased bg-gray-50 text-gray-900">
                {children}
            </body>
        </html>
    );
}
