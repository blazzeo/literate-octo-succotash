import { useEffect, useRef, useState } from 'react';
import React from 'react';
import { checkAvailableEmail, checkAvailableLogin, registerCustomer, registerVendor } from '../api';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Eye, EyeOff } from 'lucide-react';

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
	const [showPassword, setShowPassword] = useState(false);

	// Refs to store timeout IDs
	const emailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const usernameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			if (isEmailAvailable && isUsernameAvailable) {
				switch (userType) {
					case UserTypeEnum.customer:
						await registerCustomer(email, username, password, firstName, lastName)
						break
					case UserTypeEnum.vendor:
						await registerVendor(email, username, password)
						break
				}

				toast.success('We send you verification email. Please check your inbox')

				navigate('/')
			}
		} catch (error) {
			toast.error("Error occured. " + error)
			console.error(error)
		}
	};

	const passwordValidator = (password: string) => {
		const [isValid, setIsValid] = useState<boolean | null>(null);

		useEffect(() => {
			if (!password) {
				setIsValid(null); // no password yet
				return;
			}

			// Validation rules
			const lengthOk = password.length >= 8;
			const hasUpper = /[A-Z]/.test(password);
			const hasLower = /[a-z]/.test(password);
			const hasNumber = /\d/.test(password);
			const hasSymbol = /[^A-Za-z0-9]/.test(password);

			const valid = lengthOk && hasUpper && hasLower && hasNumber && hasSymbol;
			setIsValid(valid);
		}, [password]);

		return isValid;
	}

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

				{/* Switcher */}
				<div className="flex justify-center mb-6">
					<div className="inline-flex items-center rounded-full bg-gray-100 p-1 shadow-md">
						{[
							{ type: UserTypeEnum.customer, label: "Customer" },
							{ type: UserTypeEnum.vendor, label: "Vendor" },
						].map(({ type, label }) => {
							const isActive = userType === type;
							return (
								<button
									key={type}
									type="button"
									onClick={() => setUserType(type)}
									className={`px-6 py-2 text-sm font-medium rounded-full transition-all duration-200
            ${isActive
											? "bg-blue-600 text-white shadow-sm"
											: "text-gray-600 hover:text-gray-800 hover:bg-gray-200"}`}
								>
									{label}
								</button>
							);
						})}
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
						{/* Loader bar */}
						{checkingUsername && (
							<div className="w-full h-1 bg-gray-200 mt-1">
								<div className="h-1 bg-blue-500 animate-pulse w-1/2"></div>
							</div>
						)}
						{!isUsernameAvailable && (
							<p className="text-red-500 text-sm mt-1">Username is already taken</p>
						)}
					</div>

					{/* Customer-specific fields */}
					{userType == UserTypeEnum.customer &&
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
					}

					<div>
						<label className="block text-sm font-medium text-gray-700">Email</label>
						<input
							type="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="mt-1 w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						{/* Loader bar */}
						{checkingEmail && (
							<div className="w-full h-1 bg-gray-200 mt-1">
								<div className="h-1 bg-blue-500 animate-pulse w-1/2"></div>
							</div>
						)}
						{!isEmailAvailable && (
							<p className="text-red-500 text-sm mt-1">Email is already taken</p>
						)}
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700">Password</label>
						<div className='relative mt-1'>
							<input
								type={showPassword ? "text" : "password"}
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder='Enter password'
								className="mt-1 w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							<button
								type="button"
								onClick={() => setShowPassword((prev) => !prev)}
								className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
							>
								{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
							</button>
						</div>
						{passwordValidator(password) === null && <p>Type your password</p>}
						{passwordValidator(password) === false && (
							<p className="text-red-500">
								Password must be at least 8 characters, include uppercase, lowercase,
								number, and symbol.
							</p>
						)}
						{passwordValidator(password) === true && <p className="text-green-500">Strong password ✅</p>}
					</div>


					<button
						type="submit"
						className={`w-full py-2 rounded-lg border border-gray-300 transition ${!isEmailAvailable ||
							!isUsernameAvailable ||
							(userType == UserTypeEnum.customer && (firstName.length == 0 || lastName.length == 0))
							? "text-gray-600 hover:text-gray-800 bg-gray-200" : "bg-blue-600 text-white hover:bg-blue-700"}`}
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

