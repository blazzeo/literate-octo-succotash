import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./services/routes";
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<ToastContainer
					position="top-right"
					autoClose={3000}
					hideProgressBar={false}
					closeOnClick
					pauseOnHover
					draggable
					theme="colored"
				/>
				<AppRoutes />
			</AuthProvider>
		</BrowserRouter >
	);
}

