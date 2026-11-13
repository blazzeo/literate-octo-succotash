import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../api';
import { toast } from 'react-toastify';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

export default function ConfirmEmail() {
	const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
	const [searchParams] = useSearchParams();

	useEffect(() => {
		const token = searchParams.get('token');

		if (!token) {
			toast.error(`Verification token hasn't been provided`);
			setStatus('error');
			return;
		}

		const verify = async () => {
			try {
				const result = await verifyEmail(token);
				if (!result) throw new Error();
				toast.success("Your email was verified!");
				setStatus('success');
			} catch (error) {
				toast.error("Verification failed!");
				setStatus('error');
			}
		};

		verify();
	}, [searchParams]);

	const renderContent = () => {
		switch (status) {
			case 'pending':
				return (
					<div className="flex flex-col items-center gap-4">
						<div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
						<p className="text-lg text-blue-700">Confirming your email...</p>
					</div>
				);
			case 'success':
				return (
					<div className="flex flex-col items-center gap-4">
						<CheckCircleIcon className="w-12 h-12 text-green-500" />
						<h2 className="text-xl font-semibold text-green-700">Email confirmed!</h2>
						<p className="text-gray-600">You can now log in to your account.</p>
						<Link to="/login" className="mt-2 inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
							Go to Login
							<ArrowRightIcon className="w-4 h-4" />
						</Link>
					</div>
				);
			case 'error':
				return (
					<div className="flex flex-col items-center gap-4">
						<XCircleIcon className="w-12 h-12 text-red-500" />
						<h2 className="text-xl font-semibold text-red-700">Verification failed</h2>
						<p className="text-gray-600">The token is invalid or has expired.</p>
						<Link to="/" className="mt-2 inline-flex items-center gap-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition">
							Back to Home
						</Link>
					</div>
				);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
			<div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
				{renderContent()}
			</div>
		</div>
	);
}

