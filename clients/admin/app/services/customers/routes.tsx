import { Route } from "react-router-dom";
import React from "react";
import ProfilePage from "./pages/profile.tsx";

export default function CustomersRoutes() {
	return (
		<>
			<Route path="profile" element={<ProfilePage />} />
		</>
	);
}

