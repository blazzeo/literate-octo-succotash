import { useState } from 'react';
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';

export default function LoginPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const navigate = useNavigate();
	const { login } = useAuth();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			let response = await login(email, password)

			if (response) {
				toast.success('Logged in')
				navigate('/')
			} else {
				throw "Authentification failed";
			}
		} catch (error) {
			console.error(error)
			toast.error('Authentification failed')
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
			<div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
				<h1 className="text-2xl text-black font-semibold text-center mb-6">Sign In</h1>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700">Email</label>
						<input
							type="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="mt-1 w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700">Password</label>
						<input
							type="password"
							required
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="mt-1 w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					<button
						type="submit"
						className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
					>
						Login
					</button>
				</form>
				<p className="text-sm text-center text-gray-600 mt-4">
					Don't have an account?{' '}
					<Link to="/signup" className="text-blue-600 hover:underline">
						Sign up
					</Link>
				</p>
				<p className="text-sm text-center text-gray-600 mt-4">
					Forgot your password?{' '}
					<Link to="/restore" className="text-blue-600 hover:underline">
						Restore it
					</Link>
				</p>
			</div>
		</div>
	);
}

