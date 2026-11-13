import React, { useState, useRef, useEffect } from "react";
import Layout from "../components/Layout/Layout";
import { useAuth } from "../context/AuthContext";
import { fetchProfile, updateProfile } from "../apis/customers_api";
import { upload_avatar, BLOB_SERVICE_URI } from "../apis/blob_api";
import { CustomerInfo } from "../context/types";
import { deactivateProfile } from "../apis/auth_api";
import { useMetaMask } from "../context/Metamask";

const defaultCustomer: CustomerInfo = {
	id: localStorage.getItem("user_id")!,
	login: "",
	email: "",
	first_name: "",
	last_name: "",
	shipment_addresses: [],
	billing_address: "",
	wallets: [],
};

export default function ProfilePage() {
	const [edit, setEdit] = useState(false);
	const [data, setData] = useState<CustomerInfo>(defaultCustomer);
	const [form, setForm] = useState<CustomerInfo>(defaultCustomer);
	const [isModalOpen, setModalOpen] = useState(false);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const { user } = useAuth();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { account, chainId, connect } = useMetaMask();

	useEffect(() => {
		const loadProfile = async () => {
			const userData = await fetchProfile(localStorage.getItem('user_id')!);
			if (userData) {
				setData({
					...defaultCustomer,
					...userData,
					shipment_addresses: userData.shipment_addresses ?? [],
					wallets: userData.wallets ?? [],
					billing_address: userData.billing_address ?? "",
				});
				setForm({
					...defaultCustomer,
					...userData,
					shipment_addresses: userData.shipment_addresses ?? [],
					wallets: userData.wallets ?? [],
					billing_address: userData.billing_address ?? "",
				});
			}
		};
		loadProfile();
	}, []);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof CustomerInfo) => {
		if (!form) return;
		setForm({ ...form, [field]: e.target.value });
	};


	const handleArrayChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof CustomerInfo, idx: number) => {
		if (!form) return;
		const arr = [...(form[field] as string[])];
		arr[idx] = e.target.value;
		setForm({ ...form, [field]: arr });
	};

	const handleAddArrayItem = (field: keyof CustomerInfo) => {
		if (!form) return;
		setForm({ ...form, [field]: [...((form[field] as string[]) ?? []), ""] });
	};

	const handleRemoveArrayItem = (field: keyof CustomerInfo, idx: number) => {
		if (!form) return;
		const arr = [...(form[field] as string[])];
		arr.splice(idx, 1);
		setForm({ ...form, [field]: arr });
	};

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			setAvatarFile(e.target.files[0]);
		}
	};

	const handleSave = async () => {
		setData(form);

		await updateProfile(form);
		if (avatarFile && user?.id) {
			await upload_avatar(avatarFile, user.id);
		}
		setEdit(false);
	};

	const handleDeactivate = async () => {
		await deactivateProfile();

		setEdit(false);
	}

	return (
		<Layout>
			<div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded shadow-lg mt-10">
				<div className="flex items-center mb-6">
					{edit ? (
						<label className="cursor-pointer relative">
							<img
								src={`${BLOB_SERVICE_URI}/file/avatars/${user?.id}.jpg`}
								alt="avatar"
								className="w-24 h-24 rounded-full mr-6 border object-cover"
								onError={(e) => {
									const target = e.currentTarget as HTMLImageElement;
									target.onerror = null;
									target.src =
										"https://i0.wp.com/sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png?ssl=1";
								}}
							/>
							<input
								type="file"
								accept="image/*"
								className="hidden"
								onChange={handleAvatarChange}
								ref={fileInputRef}
							/>
							<span className="absolute bottom-0 right-0 bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-1 text-xs">
								Change
							</span>
						</label>
					) : (
						<img
							src={`${BLOB_SERVICE_URI}/file/avatars/${user?.id}.jpg`}
							alt="avatar"
							className="w-24 h-24 rounded-full mr-6 border object-cover"
							onError={(e) => {
								const target = e.currentTarget as HTMLImageElement;
								target.onerror = null;
								target.src =
									"https://i0.wp.com/sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png?ssl=1";
							}}
						/>
					)}
					<div>
						<h2 className="text-2xl font-bold">{data.first_name} {data.last_name}</h2>
						<p className="text-gray-500 dark:text-gray-400">{data.login}</p>
					</div>
				</div>

				{edit ? (
					<form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSave(); }}>
						<div>
							<label className="block font-medium">Login</label>
							<input className="input w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white rounded p-2" value={form.login} onChange={e => handleChange(e, "login")} />
						</div>
						<div>
							<label className="block font-medium">Email</label>
							<input className="input w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white rounded p-2" value={form.email} onChange={e => handleChange(e, "email")} />
						</div>
						<div>
							<label className="block font-medium">First Name</label>
							<input className="input w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white rounded p-2" value={form.first_name} onChange={e => handleChange(e, "first_name")} />
						</div>
						<div>
							<label className="block font-medium">Last Name</label>
							<input className="input w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white rounded p-2" value={form.last_name} onChange={e => handleChange(e, "last_name")} />
						</div>
						<div>
							<label className="block font-medium">Shipment Addresses</label>
							{(form.shipment_addresses ?? []).map((addr, idx) => (
								<div key={idx} className="flex gap-2 mb-1">
									<input className="input flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white rounded p-2" value={addr} onChange={e => handleArrayChange(e, "shipment_addresses", idx)} />
									<button type="button" className="text-red-500 hover:text-red-400" onClick={() => handleRemoveArrayItem("shipment_addresses", idx)}>-</button>
								</div>
							))}
							<button type="button" className="text-blue-500 hover:text-blue-400" onClick={() => handleAddArrayItem("shipment_addresses")}>Add Address</button>
						</div>
						<div>
							<label className="block font-medium">Billing Address</label>
							<input className="input w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white rounded p-2" value={form.billing_address ?? ""} onChange={e => handleChange(e, "billing_address")} />
						</div>
						<div>
							<label className="block font-medium">Wallets</label>

							{(form.wallets ?? []).map((wallet, idx) => (
								<div key={idx} className="flex gap-2 mb-1">
									<input
										className="input flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white rounded p-2"
										value={wallet}
										onChange={(e) => handleArrayChange(e, "wallets", idx)}
									/>
									<button
										type="button"
										className="text-red-500 hover:text-red-400"
										onClick={() => handleRemoveArrayItem("wallets", idx)}
									>
										-
									</button>
								</div>
							))}

							{/* 🔹 Wallet connection button or status */}
							{account ? (
								<div className="mt-3 p-3 border rounded-lg bg-green-50 dark:bg-green-900/20 text-sm text-green-800 dark:text-green-300">
									✅ Wallet connected:
									<div className="font-mono break-all">{account}</div>
									<div>Chain ID: {chainId}</div>
								</div>
							) : (
								<div className="mt-3 p-3 border rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-800 dark:text-red-300">
									❌ Wallet not connected.
									<button
										type="button"
										className="ml-2 text-blue-500 hover:text-blue-400"
										onClick={connect}
									>
										Connect Wallet
									</button>
								</div>
							)}
						</div>
						<div className="flex justify-between gap-4 mt-6">
							<div className="flex gap-4">
								<button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition">Save</button>
								<button type="button" className="px-4 py-2 bg-gray-400 hover:bg-gray-500 dark:bg-gray-600 dark:hover:bg-gray-500 text-white font-medium rounded-lg transition" onClick={() => setEdit(false)}>Cancel</button>
							</div>
							<div>
								<button type="button" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition" onClick={() => setModalOpen(true)}>Delete</button>
							</div>
						</div>
					</form>
				) : (
					<div className="space-y-4">
						<div><span className="font-medium">Login:</span> {data.login}</div>
						<div><span className="font-medium">Email:</span> {data.email}</div>
						<div><span className="font-medium">First Name:</span> {data.first_name}</div>
						<div><span className="font-medium">Last Name:</span> {data.last_name}</div>
						<div>
							<span className="font-medium">Shipment Addresses:</span>
							<ul className="list-disc ml-6">
								{(data.shipment_addresses ?? []).map((addr, idx) => <li key={idx}>{addr}</li>)}
							</ul>
						</div>
						<div><span className="font-medium">Billing Address:</span> {data.billing_address}</div>
						{/* 🔹 Wallet connection button or status */}
						{account ? (
							<div className="mt-3 p-3 border rounded-lg bg-green-50 dark:bg-green-900/20 text-sm text-green-800 dark:text-green-300">
								✅ Wallet connected:
								<div className="font-mono break-all">{account}</div>
								<div>Chain ID: {chainId}</div>
							</div>
						) : (
							<div className="mt-3 p-3 border rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-800 dark:text-red-300">
								❌ Wallet not connected.
								<button
									type="button"
									className="ml-2 text-blue-500 hover:text-blue-400"
									onClick={connect}
								>
									Connect Wallet
								</button>
							</div>
						)}
						<button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition mt-6" onClick={() => { setForm(data); setEdit(true); }}>Edit</button>
					</div>
				)}
			</div>

			{/* 🔹 Confirmation Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
					<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full text-gray-900 dark:text-gray-100">
						<h3 className="text-lg font-semibold mb-3">Confirm Deactivation</h3>
						<p className="text-gray-600 dark:text-gray-300 mb-6">
							Are you sure you want to deactivate this user?
						</p>

						<div className="flex justify-end gap-3">
							<button
								className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition"
								onClick={() => setModalOpen(false)}
							>
								Cancel
							</button>

							<button
								className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
								onClick={handleDeactivate}
							>
								Confirm
							</button>
						</div>
					</div>
				</div>
			)}
		</Layout>
	);
}

