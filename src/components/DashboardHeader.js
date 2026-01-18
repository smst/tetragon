export default function DashboardHeader({ userEmail, role, onLogout }) {
    // Define badge colors for roles
    return (
        <nav className="bg-white border-b border-gray-200 shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Title and Role Badge */}
                    <div className="flex items-center gap-6">
                        <h1 className="text-xl font-sans font-bold text-gray-900">
                            SMST Dashboard
                        </h1>
                        <span
                            className={
                                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-purple-100 text-purple-800"
                            }
                        >
                            {role}
                        </span>
                    </div>

                    {/* User Info & Logout */}
                    <div className="flex items-center gap-6">
                        <span className="text-sm text-gray-500 hidden md:block truncate max-w-54">
                            {userEmail}
                        </span>
                        <button
                            onClick={onLogout}
                            className="border border-red-300 px-4 py-1.5 rounded-lg shadow-md text-sm font-medium bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800 transition-all cursor-pointer active:scale-90"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
