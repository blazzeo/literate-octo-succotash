import React, { useState, useEffect } from "react";
import { ShoppingCart, User, Filter, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
	const [searchPrompt, setSearchPrompt] = useState('');
	const [visibleSearchList, setVisibleSearchList] = useState(false);
	const [cartCount, setCartCount] = useState(0);
	const [profileMenuOpen, setProfileMenuOpen] = useState(false);
	const { logout, user } = useAuth();
	const [imgError, setImgError] = useState(false);

	// Close menu on click beside it
	useEffect(() => {
		if (!profileMenuOpen) return;
		const handleClick = (e: MouseEvent) => {
			const menu = document.getElementById('profile-menu');
			if (menu && !menu.contains(e.target as Node)) {
				setProfileMenuOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClick);
		return () => document.removeEventListener('mousedown', handleClick);
	}, [profileMenuOpen]);

	return (
		<header className="bg-white shadow-sm p-4 flex justify-between items-center">
			{/* Left side: Logo / Home */}
			<div className="flex items-center gap-4">
				<Link to="/" className="text-xl font-semibold text-gray-800 hover:text-blue-600">
					<img src="" alt="eMarket" />
				</Link>

				<button
					onClick={() => setVisibleSearchList((v) => !v)}
					className="flex items-center gap-1 text-gray-700 hover:text-blue-600"
				>
					<Filter size={18} />
					Filters
				</button>
			</div>

			{/* Center: Search input */}
			<div className="flex items-center gap-2 w-full max-w-md mx-auto">
				<div className="relative w-full">
					<span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
						<Search size={18} />
					</span>
					<input
						type="text"
						placeholder="Search product, categories..."
						value={searchPrompt}
						onChange={(e) => setSearchPrompt(e.target.value)}
						className="pl-10 pr-4 py-2 w-full rounded-2xl bg-gray-50 border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all duration-200 shadow-sm focus:shadow-lg placeholder-gray-400 text-gray-800 outline-none"
					/>
				</div>

				{/* Drop-down menu */}
				{searchPrompt.length > 0 && (
					<div></div>
				)}
			</div>

			{/* Right side: Cart and Profile */}
			<div className="flex items-center gap-6">
				<Link to="/cart" className="relative flex items-center text-gray-700 hover:text-blue-600">
					<ShoppingCart size={22} />
					{cartCount > 0 && (
						<span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs rounded-full px-1">
							{cartCount}
						</span>
					)}
				</Link>

				<div className="relative">
					<button
						onClick={() => setProfileMenuOpen((v) => !v)}
						className="flex items-center text-gray-700 hover:text-blue-600 focus:outline-none"
					>
						{!imgError ? (
							<img
								src={`${import.meta.env.VITE_BLOB_SERVICE_URI}/file/avatars/${user?.id}.png`}
								alt="Profile"
								className="w-8 h-8 rounded-full object-cover"
								onError={() => setImgError(true)}
							/>
						) : (
							<User size={22} />
						)}
					</button>
					{profileMenuOpen && (
						<div
							id="profile-menu"
							className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg z-50"
						>
							<Link
								to="/profile"
								className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
								onClick={() => setProfileMenuOpen(false)}
							>
								Profile
							</Link>
							<button
								onClick={() => { setProfileMenuOpen(false); logout() }}
								className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
							>
								Log out
							</button>
						</div>
					)}
				</div>
			</div>
		</header>
	);
}
