import React, { useState } from "react";
import { User, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { BLOB_SERVICE_URI } from "../../apis/blob_api";

export default function Header() {
	const [profileMenuOpen, setProfileMenuOpen] = useState(false);
	const { logout, user } = useAuth();
	const [imgError, setImgError] = useState(false);

	return (
		<header className="bg-white shadow-sm p-4 flex justify-between items-center">
			{/* Left side: Logo / Home */}
			<div className="flex items-center gap-4">
				<Link to="/" className="text-xl font-semibold text-gray-800 hover:text-blue-600">
					<img src="/logo.png" alt="Logo" className="w-20" />
				</Link>

				<div className="flex items-center gap-2 w-full max-w-md mx-auto">
					<Link to="/my-goods" className="relative flex items-center text-gray-700 hover:text-blue-600">
						My Goods
					</Link>
				</div>

				<div className="flex items-center gap-2 w-full max-w-md mx-auto">
					<Link to="/orders" className="relative flex items-center text-gray-700 hover:text-blue-600">
						Orders
					</Link>
				</div>

			</div>


			{/* Right side: AddNewGood, Cart and Profile */}
			<div className="flex items-center gap-6">
				<Link to="/new-good" className="relative flex items-center text-gray-700 hover:text-blue-600">
					<PlusCircle size={22} />
				</Link>

				<div className="relative">
					<button
						onClick={() => setProfileMenuOpen((v) => !v)}
						className="flex items-center cursor-pointer text-gray-700 hover:text-blue-600 focus:outline-none"
					>
						{!imgError ? (
							<img
								src={`${BLOB_SERVICE_URI}/file/avatars/${user?.id}.jpg`}
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
							className="absolute right-0 mt-2 w-40 bg-white border border-gray-300 rounded shadow-lg z-50"
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
								Log Out
							</button>
						</div>
					)}
				</div>
			</div>
		</header >
	);
}
