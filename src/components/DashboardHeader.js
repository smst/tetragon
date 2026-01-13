export default function DashboardHeader({ userEmail, role, onLogout }) {
    // Define badge colors for roles
    const roleColors = {
        admin: "bg-purple-100 text-purple-800",
        grader: "bg-blue-100 text-blue-800",
        proctor: "bg-green-100 text-green-800",
        unassigned: "bg-gray-100 text-gray-800",
    };

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Brand & Role Badge */}
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                            SMST Dashboard
                        </h1>
                        <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${
                                roleColors[role] || roleColors.unassigned
                            }`}
                        >
                            {role} View
                        </span>
                    </div>

                    {/* User Info & Logout */}
                    <div className="flex items-center gap-6">
                        <span className="text-sm text-gray-500 hidden sm:block truncate max-w-37.5">
                            {userEmail}
                        </span>
                        <button
                            onClick={onLogout}
                            className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
