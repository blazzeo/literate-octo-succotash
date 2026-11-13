import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, logout, refresh_token, AUTH_CLIENT_URI } from '../apis/auth_api';
import { User, UserType } from '../context/types'
import { CUSTOMERS_CLIENT_URI } from '../apis/customer_api';

interface AuthContextType {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	logout: () => void;
	error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [user, setUser] = useState<User | null>(null);

	const checkAuth = async () => {
		try {
			// Try to fetch user's data
			const me: User = await getMe();
			if (me.role != UserType.vendor)
				window.location.href = `${CUSTOMERS_CLIENT_URI}`

			setUser(me);

			localStorage.setItem("user_id", me.id);

			setIsAuthenticated(true);
		} catch (err) {
			try {
				// If getMe throws excpt -> refresh_token
				const refreshed = await refresh_token();
				if (!refreshed) throw new Error("Token refresh failed");

				// Again try to fetch user's data
				const me: User = await getMe();
				if (me.role != UserType.vendor)
					window.location.href = `${CUSTOMERS_CLIENT_URI}`

				setUser(me);

				localStorage.setItem("user_id", me.id);

				setIsAuthenticated(true);
			} catch (refreshErr) {
				// Otherwise -> redirect
				setIsAuthenticated(false);
				localStorage.removeItem("user_id");
				setUser(null)
				window.location.href = `${AUTH_CLIENT_URI}/login`
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleLogout = async () => {
		try {
			const ok = await logout();
			setIsAuthenticated(false);
			setUser(null);
			localStorage.removeItem("user_id");
			window.location.href = `${AUTH_CLIENT_URI}/login`;
			if (!ok) console.warn("Logout API failed, but client cleared session.");
		} catch {
			setError('Error logging out.');
		}
	};

	useEffect(() => {
		checkAuth();
	}, []);

	return (
		<AuthContext.Provider value={{ user, isAuthenticated, isLoading, logout: handleLogout, error }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};

