import React, { useEffect, useState } from "react";
import { ShoppingCart, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useBasketInfo } from "../../context/BasketContext";
import { BLOB_SERVICE_URI } from "../../apis/blob_api";
import { AUTH_CLIENT_URI } from "../../apis/auth_api";

export default function Header() {
	const [profileMenuOpen, setProfileMenuOpen] = useState(false);
	const { logout, user } = useAuth();
	const [imgError, setImgError] = useState(false);

	const { cartCount } = useBasketInfo();

	useEffect(() => {
	}, [])

	return (
		<header className="bg-red-100 shadow-md p-4 flex justify-between items-center">
			{/* Left side: Logo / Home */}
			<div className="flex items-center gap-4">
				<Link to="/" className="text-xl font-semibold text-gray-800 hover:text-blue-600">
					<img src="/logo.png" alt="Logo" className="w-20" />
				</Link>

				<div className="flex items-center gap-2 w-full max-w-md mx-auto">
					<Link to="/orders" className="relative flex items-center text-gray-700 hover:text-blue-600">
						Orders
					</Link>
				</div>
			</div>

			{/* Right side: Cart and Profile */}
			<div className="flex items-center gap-6">
				{user &&
					<Link to="/cart" className="relative flex items-center text-gray-700 hover:text-blue-600">
						<ShoppingCart size={22} />
						{cartCount > 0 && (
							<span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs rounded-full px-1">
								{cartCount}
							</span>
						)}
					</Link>
				}

				<div className="relative">
					{user ? <>

						<button
							onClick={() => setProfileMenuOpen((v) => !v)}
							className="flex items-center text-gray-700 hover:text-blue-600 focus:outline-none"
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
									Log out
								</button>
							</div>
						)}
					</>
						:
						<div className="flex gap-2">
							<a className="px-4 py-2 btn btn-secondary transition" href={`${AUTH_CLIENT_URI}/signup`}>Sign Up</a>
							<a className="px-4 py-2 btn btn-primary transition" href={`${AUTH_CLIENT_URI}/login`}>Sign In</a>
						</div >
					}
				</div>
			</div>
		</header>
	);
}
