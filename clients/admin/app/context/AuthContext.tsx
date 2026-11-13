import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login, logout, refresh_token } from '../services/auth/api';

enum UserType {
	customer = 'customer',
	vendor = 'vendor',
	admin = 'admin'
}

interface User {
	id: string;
	name: string;
	login: string;
	email: string;
	role: UserType;
}

interface AuthContextType {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (email: string, password: string) => Promise<boolean>;
	logout: () => Promise<boolean>;
	error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [user, setUser] = useState<User | null>(null);

	useEffect(() => {
		checkAuth();
	}, []);

	const checkAuth = async () => {
		try {
			//	Check token validity
			const isAuth = await refresh_token();

			//	Get UserInfo from auth_service
			const me: User = await getMe();

			setUser(me);
			setIsAuthenticated(isAuth);
		} catch (err) {
			setIsAuthenticated(false);
		} finally {
			setIsLoading(false);
		}
	};

	const handleLogin = async (email: string, password: string) => {
		try {
			setError(null);
			const success = await login(email, password);

			if (success)
				await checkAuth();

			return success;
		} catch (err) {
			setError('Log in failed. Check your credentials.');
			return false;
		}
	};

	const handleLogout = async () => {
		try {
			const success = await logout();
			if (success) {
				setIsAuthenticated(false);
				setUser(null);
			}
			return success;
		} catch (err) {
			setError('Log out failed.');
			return false;
		}
	};

	return (
		<AuthContext.Provider value={{ user, isAuthenticated, isLoading, login: handleLogin, logout: handleLogout, error }}>
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

