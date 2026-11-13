import React, { useState, useRef, useEffect } from "react";
import { BLOB_SERVICE_URI, uploadAvatar } from "./../apis/blob_api";
import { updateProfile, getVendorInfo } from "./../apis/vendor_api"
import Layout from "./../components/layout/Layout";
import { useAuth } from "./../context/AuthContext";
import { VendorInfo } from "./../context/types"
import { toast } from "react-toastify";
import { useMetaMask } from "../context/Metamask";

const defaultVendor: VendorInfo = {
	id: localStorage.getItem("user_id")!,
	login: "",
	email: "",
	avatar_uri: null,
	billing_address: "",
	wallets: [],
};

export default function ProfilePage() {
	const [edit, setEdit] = useState(false);
	const [data, setData] = useState<VendorInfo>(defaultVendor);
	const [form, setForm] = useState<VendorInfo>(defaultVendor);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	// const [contractVendorInfo, setContractVendorInfo] = useState<VendorInfoContract>()
	const { user, isLoading } = useAuth();
	const [loading, setLoading] = useState(true);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { account, chainId, connect, deactivateAccount, activateAccount, isActive } = useMetaMask();

	const loadProfile = async () => {
		const userData = await getVendorInfo(localStorage.getItem('user_id')!);
		if (userData) {
			setData({
				...defaultVendor,
				...userData,
				wallets: userData.wallets ?? [],
				billing_address: userData.billing_address ?? "",
			});
			setForm({
				...defaultVendor,
				...userData,
				wallets: userData.wallets ?? [],
				billing_address: userData.billing_address ?? "",
			});
		}

		setLoading(false);
	};

	useEffect(() => {
		loadProfile();
	}, []);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof VendorInfo) => {
		if (!form) return;
		setForm({ ...form, [field]: e.target.value });
	};


	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			setAvatarFile(e.target.files[0]);
		}
	};

	const handleSave = async () => {
		try {
			setData(form);
			await updateProfile(form);
			if (avatarFile && user?.id) {
				await uploadAvatar(avatarFile, user.id);
			}
			setEdit(false);
		} catch (error) {
			console.error(error)
			toast.error(error)
		}
	};

	const handleActivation = async () => {
		if (isActive)
			await deactivateAccount()
		else
			await activateAccount()

		await loadProfile()
	}

	if (isLoading || loading) {
		return <Layout><h2>Loading...</h2></Layout>;
	}

	return (
		<Layout>
			<div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg mt-10 border border-gray-200 dark:border-gray-700">
				<div className="flex flex-start justify-between">
					<div className="flex items-center mb-6">
						{edit ? (
							<label className="cursor-pointer relative">
								<img
									src={`${BLOB_SERVICE_URI}/file/avatars/${user?.id}.jpg`}
									alt="avatar"
									className="w-24 h-24 rounded-full mr-6 border-2 border-gray-300 dark:border-gray-600 object-cover"
									onError={(e) => {
										const target = e.currentTarget as HTMLImageElement;
										target.onerror = null;
										target.src = "https://i0.wp.com/sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png?ssl=1";
									}}
								/>
								<input
									type="file"
									accept="image/*"
									className="hidden"
									onChange={handleAvatarChange}
									ref={fileInputRef}
								/>
								<span className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full px-2 py-1 text-xs shadow-md">Change</span>
							</label>
						) : (
							<img
								src={`${BLOB_SERVICE_URI}/file/avatars/${user?.id}.jpg`}
								alt="avatar"
								className="w-24 h-24 rounded-full mr-6 border-2 border-gray-300 dark:border-gray-600 object-cover"
								onError={(e) => {
									const target = e.currentTarget as HTMLImageElement;
									target.onerror = null;
									target.src = "https://i0.wp.com/sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png?ssl=1";
								}}
							/>
						)}
						<div>
							<p className="text-gray-900 dark:text-white text-xl font-bold">{data.login}</p>
						</div>
					</div>
					<div>
						{isActive ?
							<div className="p-3 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/30 text-sm text-green-800 dark:text-green-200">
								<div className="flex items-center">
									<span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
									✅ Active
								</div>
							</div> :
							<div className="mt-3 p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/30 text-sm text-red-800 dark:text-red-200">
								<div className="flex items-center">
									<span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
									❌ Deactivated
								</div>
							</div>
						}
					</div>
				</div>
				{edit ? (
					<form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSave(); }}>
						<div>
							<label className="block font-medium text-gray-900 dark:text-white">Login</label>
							<input
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
								value={form.login}
								onChange={e => handleChange(e, "login")}
							/>
						</div>
						<div>
							<label className="block font-medium text-gray-900 dark:text-white">Email</label>
							<input
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
								value={form.email}
								onChange={e => handleChange(e, "email")}
							/>
						</div>
						<div>
							<label className="block font-medium text-gray-900 dark:text-white">Billing Address</label>
							<input
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
								value={form.billing_address ?? ""}
								onChange={e => handleChange(e, "billing_address")}
							/>
						</div>
						{account ? (
							<div className="mt-3 p-3 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/30 text-sm text-green-800 dark:text-green-200">
								<div className="flex items-center mb-2">
									<span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
									✅ Wallet connected
								</div>
								<div className="font-mono break-all text-green-700 dark:text-green-300">{account}</div>
								<div className="text-green-600 dark:text-green-400">Chain ID: {chainId}</div>
							</div>
						) : (
							<div className="mt-3 p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/30 text-sm text-red-800 dark:text-red-200">
								<div className="flex items-center mb-2">
									<span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
									❌ Wallet not connected
								</div>
								<button
									type="button"
									className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors duration-200"
									onClick={connect}
								>
									Connect Wallet
								</button>
							</div>
						)}
						<div className="flex gap-4 mt-6">
							<button type="submit" className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200">
								Save
							</button>
							<button type="button" className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200" onClick={() => setEdit(false)}>
								Cancel
							</button>
							{isActive ?
								<button type="button" className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200" onClick={() => handleActivation()}>
									Deactivate Account
								</button> :
								<button type="button" className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200" onClick={() => handleActivation()}>
									Activate Account
								</button>
							}
						</div>
					</form>
				) : (
					<div className="space-y-4">
						<div className="text-gray-900 dark:text-white">
							<span className="font-medium text-gray-700 dark:text-gray-300">Login:</span> {data.login}
						</div>
						<div className="text-gray-900 dark:text-white">
							<span className="font-medium text-gray-700 dark:text-gray-300">Email:</span> {data.email}
						</div>
						<div className="text-gray-900 dark:text-white">
							<span className="font-medium text-gray-700 dark:text-gray-300">Billing Address:</span> {data.billing_address}
						</div>
						{account ? (
							<div className="mt-3 p-3 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/30 text-sm text-green-800 dark:text-green-200">
								<div className="flex items-center mb-2">
									<span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
									✅ Wallet connected
								</div>
								<div className="font-mono break-all text-green-700 dark:text-green-300">{account}</div>
								<div className="text-green-600 dark:text-green-400">Chain ID: {chainId}</div>
							</div>
						) : (
							<div className="mt-3 p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/30 text-sm text-red-800 dark:text-red-200">
								<div className="flex items-center mb-2">
									<span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
									❌ Wallet not connected
								</div>
								<button
									type="button"
									className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors duration-200"
									onClick={connect}
								>
									Connect Wallet
								</button>
							</div>
						)}
						<button
							className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200 mt-6"
							onClick={() => { setForm(data); setEdit(true); }}
						>
							Edit
						</button>
					</div>
				)}
			</div>
		</Layout>
	);
}

