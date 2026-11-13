import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "./context/AuthContext";
import { MetaMaskProvider } from "./context/Metamask";

export default function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<MetaMaskProvider>
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
				</MetaMaskProvider>
			</AuthProvider>
		</BrowserRouter >
	);
}

