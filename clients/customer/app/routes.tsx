import { Routes, Route, Navigate } from "react-router-dom";
import React from 'react'
import Home from "./pages/home";
import { ProtectedRoute } from "./components/ProtectedRoute";
import ProfilePage from "./pages/profile";
import GoodPage from "./pages/goodPage";
import VendorPage from "./pages/vendor_page";
import CartPage from "./pages/cart_page";
import { CategoriesProvider } from "./context/categoryContext";
import { BasketProvider } from "./context/BasketContext";
import OrdersPage from "./pages/ordersPage";

export default function AppRoutes() {
	return (
		<CategoriesProvider>
			<BasketProvider>
				<Routes>
					{/* Public Routes */}
					<Route index element={<Home />} />
					<Route path="good" element={<GoodPage />} />
					<Route path="vendor" element={<VendorPage />} />

					{/* Protected Routes */}
					<Route
						path="/"
						element={
							<ProtectedRoute />
						}
					>
						<Route path="profile" element={<ProfilePage />} />
						<Route path="cart" element={<CartPage />} />
						<Route path="orders" element={<OrdersPage />} />
					</Route>

					{/* Fallback Route */}
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</BasketProvider>
		</CategoriesProvider>
	);
}

