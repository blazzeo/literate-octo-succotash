import { useEffect, useRef, useState } from 'react';
import React from 'react';
import { checkAvailableEmail, checkAvailableLogin, registerCustomer, registerVendor } from '../api';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

export enum UserTypeEnum {
	customer = 'Customer',
	vendor = 'Vendor',
}

export default function RegisterPage() {
	const navigate = useNavigate();
	const [userType, setUserType] = useState<UserTypeEnum>(UserTypeEnum.customer);

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [username, setUsername] = useState('');
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');

	const [isEmailAvailable, setIsEmailAvailable] = useState(true);
	const [isUsernameAvailable, setIsUsernameAvailable] = useState(true);

	const [checkingEmail, setCheckingEmail] = useState(false);
	const [checkingUsername, setCheckingUsername] = useState(false);

	// Refs to store timeout IDs
	const emailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const usernameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			if (isEmailAvailable && isUsernameAvailable) {
				if (userType == UserTypeEnum.customer)
					await registerCustomer(email, username, password, firstName, lastName)
				else
					await registerVendor(email, username, password)

				navigate('/')
			}
		} catch (error) {
			toast.error("Error occured. ", error)
			console.error(error)
		}
	};

	// Debounced email checker
	useEffect(() => {
		if (!email) return;
		setCheckingEmail(true);
		if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);

		emailTimeoutRef.current = setTimeout(async () => {
			try {
				const available = await checkAvailableEmail(email, userType);

				setIsEmailAvailable(available);
			} catch (e) {
				console.error('Email check failed', e);
			} finally {
				setCheckingEmail(false);
			}
		}, 500); // 500ms debounce
	}, [email, userType]);

	// Debounced username checker
	useEffect(() => {
		if (!username) return;
		setCheckingUsername(true);
		if (usernameTimeoutRef.current) clearTimeout(usernameTimeoutRef.current);

		usernameTimeoutRef.current = setTimeout(async () => {
			try {
				const available = await checkAvailableLogin(username);

				setIsUsernameAvailable(available);
			} catch (e) {
				console.error('Username check failed', e);
			} finally {
				setCheckingUsername(false);
			}
		}, 500); // 500ms debounce
	}, [username, userType]);

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
			<div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8">
				<h1 className="text-2xl text-black font-semibold text-center mb-6">Sign up</h1>

				{/* Toggle */}
				<div className="flex justify-center mb-6">
					<div className="flex gap-4 bg-gray-200 rounded-full p-1">
						{Object.values(UserTypeEnum).map((type) => (
							<button
								key={type}
								onClick={() => setUserType(type)}
								className={`px-4 py-1 rounded-full transition font-medium ${userType === type ? 'bg-blue-600 text-white' : 'text-gray-700'
									}`}
							>
								{type.charAt(0).toUpperCase() + type.slice(1)}
							</button>
						))}
					</div>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700">Username</label>
						<input
							type="text"
							required
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							className="mt-1 w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						{!isUsernameAvailable && (
							<p className="text-red-500 text-sm mt-1">Username is already taken</p>
						)}
					</div>

					{userType === UserTypeEnum.customer && (
						<>
							<div>
								<label className="block text-sm font-medium text-gray-700">First Name</label>
								<input
									type="text"
									required
									value={firstName}
									onChange={(e) => setFirstName(e.target.value)}
									className="mt-1 w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700">Last Name</label>
								<input
									type="text"
									required
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
									className="mt-1 w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
						</>
					)}

					<div>
						<label className="block text-sm font-medium text-gray-700">Email</label>
						<input
							type="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="mt-1 w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						{!isEmailAvailable && (
							<p className="text-red-500 text-sm mt-1">Email is already taken</p>
						)}
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
						disabled={!isEmailAvailable || !isUsernameAvailable}
					>
						Register
					</button>
				</form>
				<p className="text-sm text-center text-gray-600 mt-4">
					Already have an account?{' '}
					<Link to="/login" className="text-blue-600 hover:underline">
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
}

