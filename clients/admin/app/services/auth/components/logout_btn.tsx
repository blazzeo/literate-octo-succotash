import React from "react";
import { toast } from "react-toastify";
import { logout } from "../api";

export default function LogoutButton() {

	const handle_logout = async () => {
		try {
			await logout()
		} catch (e) {
			toast.error('Logout failed')
		}

	}

	return (
		<button
			className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition duration-200"
			onClick={handle_logout}
		>
			Log out
		</button>
	)
}
