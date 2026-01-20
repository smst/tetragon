export default function Footer() {
    return (
        <footer className="w-full py-8 bg-gray-50 border-t border-gray-200 mt-auto">
            <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center text-center space-y-3 text-sm text-gray-900">
                <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2">
                    <span>
                        Copyright &copy; 2026 Sharon Math and Science Tournament
                    </span>
                    <span className="hidden md:inline text-gray-400">|</span>
                    <span>Code released under the MIT license</span>
                </div>
            </div>
        </footer>
    );
}
