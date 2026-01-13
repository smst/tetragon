import "./globals.css";

export const metadata = {
    title: "Tetragon | SMST",
    description: "Tournament management system for the Sharon Math and ",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
