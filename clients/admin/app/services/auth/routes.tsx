import LoginPage from "./pages/loginPage.tsx";
import RegisterPage from "./pages/registerPage";
import ForgotPage from "./pages/forgotPage";
import ConfirmEmail from './pages/verifyEmailPage.tsx';
import ResetPasswordPage from "./pages/resetPassPage.tsx";
import { Route } from "react-router-dom";
import React from "react";

export default function AuthRoutes() {
	return (
		<>
			<Route path="/login" element={<LoginPage />} />
			<Route path="/signup" element={<RegisterPage />} />
			<Route path="/restore" element={<ForgotPage />} />
			<Route path="/verify-email" element={<ConfirmEmail />} />
			<Route path="/reset-password" element={<ResetPasswordPage />} />
		</>
	);
}

