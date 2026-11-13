import React, { useState } from 'react';
import { resetPassword } from '../api';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function useQuery() {
	const { search } = useLocation();
	return new URLSearchParams(search);
}

export default function ResetPasswordForm() {
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState('');

	const navigate = useNavigate();

	const query = useQuery();
	const token = query.get('token');

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			if (password !== confirmPassword) {
				setError('Passwords do not match');
				return;
			}

			setError('');

			await resetPassword(token, confirmPassword);

			toast.success("Password changed successfully.")

			navigate('/login')
		} catch (error) {
			toast.error(error)
		}
	};

	const passwordsMatch = password === confirmPassword && password.length >= 8;

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
			<div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
				<h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
					Set New Password
				</h2>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700">New Password</label>
						<input
							type="password"
							required
							minLength={8}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700">Confirm Password</label>
						<input
							type="password"
							required
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					{error && <p className="text-red-500 text-sm">{error}</p>}

					<button
						type="submit"
						disabled={!passwordsMatch}
						className={`w-full py-2 rounded-lg transition text-white ${passwordsMatch ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
							}`}
					>
						Update Password
					</button>
				</form>
			</div>
		</div>
	);
}
