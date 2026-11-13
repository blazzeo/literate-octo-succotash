import { Routes, Route, Navigate } from "react-router-dom";
import React from 'react'
import Home from "./pages/home";
import { ProtectedRoute } from "./components/ProtectedRoute";
import ProfilePage from "./pages/profile";
import { AddGoodPage } from "./pages/addGoodPage";
import { CategoriesProvider } from "./context/categoryContext";
import MyGoodPage from "./pages/myGoodPage";
import GoodPage from "./pages/goodPage";
import VendorPage from "./pages/vendorPage"
import EditGoodPage from "./pages/editGoodPage";
import OrdersPage from "./pages/ordersPage";

export default function AppRoutes() {
	return (
		<CategoriesProvider>
			<Routes>
				{/* Protected Routes */}
				<Route
					path="/"
					element={
						<ProtectedRoute />
					}
				>
					<Route index element={<Home />} />
					<Route path="profile" element={<ProfilePage />} />
					<Route path="vendor" element={<VendorPage />} />
					<Route path="new-good" element={<AddGoodPage />} />
					<Route path="my-goods" element={<MyGoodPage />} />
					<Route path="edit-good" element={<EditGoodPage />} />
					<Route path="orders" element={<OrdersPage />} />
					<Route path="good" element={<GoodPage />} />
				</Route>

				{/* Fallback Route */}
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</CategoriesProvider>
	);
}

