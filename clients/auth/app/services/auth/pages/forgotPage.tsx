import { useState } from 'react';
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { forgetPassword } from '../api';

export default function ForgotPage() {
	const [email, setEmail] = useState('');

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const success = await forgetPassword(email);

		if (success) {
			toast.success('Reset link sent to your email');
		} else {
			toast.error('Failed to send reset link');
		}

	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
			<div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
				<h1 className="text-2xl text-black font-semibold text-center mb-6">Forgot Password</h1>
				<p className="text-sm text-center text-gray-600 mb-6">
					Enter your email and we’ll send you a password reset link.
				</p>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700">Email address</label>
						<input
							type="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="mt-1 w-full bg-gray-100 text-black px-4 py-2 border-gray-300 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="you@example.com"
						/>
					</div>

					<button
						type="submit"
						className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
					>
						Send Reset Link
					</button>
				</form>

				<p className="text-sm text-center text-gray-600 mt-4">
					Forgot your password?{' '}
					<Link to="/login" className="text-blue-600 hover:underline">
						Back to login
					</Link>
				</p>
			</div>
		</div>
	);
}

