import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AUTH_CLIENT_URI } from '../apis/auth_api';

interface ProtectedRouteProps {
	fallbackPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ }) => {
	const { isAuthenticated, isLoading } = useAuth();
	const location = useLocation();

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
			</div>
		);
	}

	return (isAuthenticated) ? <Outlet /> : <Navigate to={`${AUTH_CLIENT_URI}/login`} state={{ from: location }} replace />;
};

