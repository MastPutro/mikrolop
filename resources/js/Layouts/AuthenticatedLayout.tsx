import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useState } from 'react';

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const user = usePage().props.auth.user;

    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Side Navbar */}
            <aside
                className={`${sidebarOpen ? 'w-64' : 'w-20'
                    } bg-white border-r border-gray-200 shadow-sm transition-all duration-300 ease-in-out fixed h-screen left-0 top-0 overflow-y-auto md:relative`}
            >
                <div className="p-4 flex items-center justify-between border-b border-gray-200">
                    <div className={`flex items-center ${!sidebarOpen && 'justify-center w-full'}`}>
                        <Link href="/" className="flex items-center">
                            <ApplicationLogo className="block h-8 w-auto fill-current text-gray-800" />
                            <h1 className={`text-xl font-bold ms-2 ${!sidebarOpen && 'hidden'}`}>
                                SENTOLOP
                            </h1>
                        </Link>
                    </div>
                </div>

                <nav className="mt-6 px-4 space-y-2">
                    <h1 className={`text-gray-500 uppercase text-xs font-semibold mb-2 ${!sidebarOpen && 'hidden'}`}>
                        Main
                    </h1>
                    <Link
                        href={route('dashboard')}
                        className={`flex items-center px-4 py-3 rounded-lg transition-colors ${route().current('dashboard')
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <svg
                            className="w-5 h-5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                        <span className={`ms-4 ${!sidebarOpen && 'hidden'}`}>Dashboard</span>
                    </Link>
                    <Link
                        href={route('monitor.server')}
                        className={`flex items-center px-4 py-3 rounded-lg transition-colors ${route().current('monitor.server')
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <svg
                            className="w-5 h-5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span className={`ms-4 ${!sidebarOpen && 'hidden'}`}>Monitoring Server</span>
                    </Link>

                    {/* <Link
                        href={route('mikrotik.index')}
                        className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                            route().current('mikrotik.index')
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <svg
                            className="w-5 h-5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                        </svg>
                        <span className={`ms-4 ${!sidebarOpen && 'hidden'}`}>Resource</span>
                    </Link> */}
                    <h1 className={`text-gray-500 uppercase text-xs font-semibold mb-2 ${!sidebarOpen && 'hidden'}`}>
                        Management
                    </h1>
                    <Link
                        href={route('gis.map')}
                        className={`flex items-center px-4 py-3 rounded-lg transition-colors ${route().current('gis.map')
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <svg
                            className="w-5 h-5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                        <span className={`ms-4 ${!sidebarOpen && 'hidden'}`}>Peta Sebaran</span>
                    </Link>
                    <Link
                        href={route('manajemen.index')}
                        className={`flex items-center px-4 py-3 rounded-lg transition-colors ${route().current('manajemen.index')
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <svg
                            className="w-5 h-5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14H8v-3h2v3zm4 0h-2v-6h2v6zm4 0h-2v-8h2v8z" />
                        </svg>
                        <span className={`ms-4 ${!sidebarOpen && 'hidden'}`}>Manajemen ODP</span>
                    </Link>
                    <Link
                        href={route('manajemen.user.index')}
                        className={`flex items-center px-4 py-3 rounded-lg transition-colors ${route().current('manajemen.user.index')
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <svg
                            className="w-5 h-5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span className={`ms-4 ${!sidebarOpen && 'hidden'}`}>Manajemen User</span>
                    </Link>
                    <Link
                        href={route('manajemen.paket.index')}
                        className={`flex items-center px-4 py-3 rounded-lg transition-colors ${route().current('manajemen.paket.index')
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <svg
                            className="w-5 h-5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm-1 14H5v-2h14v2zm0-4H5V8h14v6z"></path>
                        </svg>
                        <span className={`ms-4 ${!sidebarOpen && 'hidden'}`}>Manajemen Paket</span>
                    </Link>
                    <h1 className={`text-gray-500 uppercase text-xs font-semibold mb-2 ${!sidebarOpen && 'hidden'}`}>
                        Laporan & Keuangan
                    </h1>
                    <Link
                        href={route('manajemen.keuangan.index')}
                        className={`flex items-center px-4 py-3 rounded-lg transition-colors ${route().current('manajemen.keuangan.index')
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <svg
                            className="w-5 h-5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-4 16H8v-4h2v4zm4 0h-2v-8h2v8zm4 0h-2v-6h2v6z" />
                        </svg>
                        <span className={`ms-4 ${!sidebarOpen && 'hidden'}`}>Manajemen Keuangan</span>
                    </Link>
                    <Link
                        href={route('history.index')}
                        className={`flex items-center px-4 py-3 rounded-lg transition-colors ${route().current('history.index')
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <svg
                            className="w-5 h-5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="M3 2v20l2.5-1.5L8 22l2.5-1.5L13 22l2.5-1.5L18 22l2.5-1.5L23 22l-1-19H3zm13 12H8v-2h8v2zm0-4H8V8h8v2z" />
                        </svg>
                        <span className={`ms-4 ${!sidebarOpen && 'hidden'}`}>Riwayat Keuangan</span>
                    </Link>
                    <Link
                        href={route('helpdesk.index')}
                        className={`flex items-center px-4 py-3 rounded-lg transition-colors ${route().current('helpdesk.index')
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <svg
                            className="w-5 h-5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            width="24"
                            height="24"
                        >
                            <path d="M12 2a9 9 0 0 0-9 9v1h2v8H3a1 1 0 0 1-1-1v-8a11 11 0 0 1 22 0v5a3 3 0 0 1-3 3h-5v-2h5a1 1 0 0 0 1-1v-5h-2v-8h2v-1a9 9 0 0 0-9-9z" />
                            <path d="M5 12h2v8H5z" />
                            <path d="M17 12h2v8h-2z" />
                        </svg>
                        <span className={`ms-4 ${!sidebarOpen && 'hidden'}`}>Help Desk</span>
                    </Link>
                    <h1 className={`text-gray-500 uppercase text-xs font-semibold mb-2 ${!sidebarOpen && 'hidden'}`}>
                        Setting
                    </h1>
                    <Link
                        href={route('opsi.server.index')}
                        className={`flex items-center px-4 py-3 rounded-lg transition-colors ${route().current('opsi.server.index')
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <svg
                            className="w-5 h-5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="M4 2c-1.1 0-2 .9-2 2v3c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H4zm2 3.5c-.83 0-1.5-.67-1.5-1.5S5.17 2.5 6 2.5 7.5 3.17 7.5 4 6.83 5.5 6 5.5zM4 10c-1.1 0-2 .9-2 2v3c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-3c0-1.1-.9-2-2-2H4zm2 3.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM4 18c-1.1 0-2 .9-2 2v3c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-3c0-1.1-.9-2-2-2H4zm2 3.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                        </svg>
                        <span className={`ms-4 ${!sidebarOpen && 'hidden'}`}>Pengaturan Server</span>
                    </Link>


                </nav>
            </aside>

            {/* Main Content */}
            <div className={`flex-1 flex flex-col ${sidebarOpen ? 'md:ml-0' : 'md:ml-0'} ml-20 md:ml-0`}>
                {/* Top Navbar */}
                <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
                    <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                {sidebarOpen ? (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                ) : (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                )}
                            </svg>
                        </button>

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button
                                            type="button"
                                            className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-500 transition duration-150 ease-in-out hover:text-gray-700 focus:outline-none"
                                        >
                                            {user.name}

                                            <svg
                                                className="-me-0.5 ms-2 h-4 w-4"
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </button>
                                    </span>
                                </Dropdown.Trigger>

                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')}>
                                        Profile
                                    </Dropdown.Link>
                                    <Dropdown.Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                    >
                                        Log Out
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                </nav>

                {/* Header */}
                {header && (
                    <header className="bg-white shadow">
                        <div className="px-4 py-6 sm:px-6 lg:px-8">
                            {header}
                        </div>
                    </header>
                )}

                {/* Main Content */}
                <main className="flex-1 overflow-auto">{children}</main>
            </div>
        </div>
    );
}
