import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login, refresh_token } from '../services/auth/api';

const CUSTOMER_URI = import.meta.env.VITE_CUSTOMER_CLIENT_URI
const VENDOR_URI = import.meta.env.VITE_VENDOR_CLIENT_URI
const ADMIN_URI = import.meta.env.VITE_ADMIN_CLIENT_URI

export enum UserType {
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
	error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function redirectUser(userRole: UserType) {
	switch (userRole) {
		case UserType.customer:
			window.location.href = CUSTOMER_URI
			break;
		case UserType.vendor:
			window.location.href = VENDOR_URI
			break;
		case UserType.admin:
			window.location.href = ADMIN_URI
			break;
		default:
			console.error('undefined role')
	}
}

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
			const token_refreshed = await refresh_token();

			if (!token_refreshed) {
				setIsAuthenticated(false);
				return;
			}

			const me: User = await getMe();

			if (me) {
				setUser(me);
				setIsAuthenticated(true);
				redirectUser(me.role);
			} else {
				setIsAuthenticated(false);
			}
		} catch (err) {
			console.error(err);
			setIsAuthenticated(false);
		} finally {
			setIsLoading(false);
		}
	};

	const handleLogin = async (email: string, password: string) => {
		try {
			setError(null);
			const success = await login(email, password);

			if (success) {
				const me: User = await getMe();
				if (me) {
					setUser(me);
					setIsAuthenticated(true);
					redirectUser(me.role);
				}
			} else {
				setError('Login failed. Check your credentials.');
			}

			return success;
		} catch (err) {
			setError('Login failed. Check your credentials.');
			return false;
		}
	};

	return (
		<AuthContext.Provider value={{ user, isAuthenticated, isLoading, login: handleLogin, error }}>
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

