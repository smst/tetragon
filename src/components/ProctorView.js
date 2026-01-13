export default function ProctorView({ competitors }) {
    return (
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Proctor Station
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Read-only access. Please verify student attendance below.
                </p>
            </div>

            <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {competitors.length === 0 ? (
                    <li className="px-4 py-4 text-sm text-gray-500 italic text-center">
                        No competitors loaded.
                    </li>
                ) : (
                    competitors.map((c) => (
                        <li
                            key={c.id}
                            className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors flex justify-between items-center"
                        >
                            <span className="text-sm font-medium text-gray-900">
                                {c.name}
                            </span>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}
