import { Routes, Route, Navigate } from "react-router-dom";
import React from 'react'
import Home from "./home";
import AuthRoutes from "./auth/routes";
import { ProtectedRoute } from "../components/ProtectedRoute";
import CustomersRoutes from "./customers/routes";

export default function AppRoutes() {
	return (
		<Routes>
			{/* Public Routes */}
			{AuthRoutes()}

			{/* Protected Routes */}
			<Route
				path="/"
				element={
					<ProtectedRoute />
				}
			>
				<Route index element={<Home />} />
				{CustomersRoutes()}
			</Route>

			{/* Fallback Route */}
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}

