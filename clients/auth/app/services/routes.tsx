import { Routes, Route, Navigate } from "react-router-dom";
import React from 'react'
import LoginPage from "./auth//pages/loginPage.tsx";
import RegisterPage from "./auth//pages/registerPage";
import ForgotPage from "./auth//pages/forgotPage";
import ConfirmEmail from './auth//pages/verifyEmailPage.tsx';
import ResetPasswordPage from "./auth/pages/resetPassPage.tsx";

export default function AppRoutes() {
	return (
		<Routes>
			{/* Public Routes */}
			<Route path="/login" element={<LoginPage />} />
			<Route path="/signup" element={<RegisterPage />} />
			<Route path="/restore" element={<ForgotPage />} />
			<Route path="/verify-email" element={<ConfirmEmail />} />
			<Route path="/reset-password" element={<ResetPasswordPage />} />

			{/* Fallback Route */}
			<Route path="*" element={<Navigate to="/login" replace />} />
		</Routes>
	);
}

