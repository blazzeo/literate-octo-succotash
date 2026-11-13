import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import Layout from "./../components/layout/Layout";
import { useCategories } from "./../context/categoryContext";
import { Category } from "./../context/types";
import { upload_good } from "./../apis/goods_api";
import { upload_files } from "./../apis/blob_api"
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useMetaMask } from '../context/Metamask'

export function AddGoodPage() {
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [price, setPrice] = useState<number | undefined>(undefined)
	const [photos, setPhotos] = useState<File[]>([])

	const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
	const { isConnected, connect } = useMetaMask();

	let { categories } = useCategories()
	const navigate = useNavigate()

	// Dropzone
	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		accept: { "image/*": [] },
		onDrop: (acceptedFiles) => {
			setPhotos([...photos, ...acceptedFiles]);
		},
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			let good_id = await upload_good(title, description, selectedCategoryIds, price);
			await upload_files(good_id, photos);
			toast.success('Good uploaded successfully')
			navigate('/')
		} catch (error) {
			toast.error('Error while uploading good: ', error)
		}
	};

	const toggleCategory = (category: Category) => {
		if (selectedCategoryIds.includes(category._id)) {
			setSelectedCategoryIds(prev => prev.filter(id => id !== category._id));
		} else {
			setSelectedCategoryIds(prev => [...prev, category._id]);
		}
	};

	if (!isConnected) return (
		<Layout>
			<div className="flex flex-col items-center justify-center p-8 bg-blue-50 border border-blue-200 rounded-xl max-w-md mx-auto">
				<div className="text-blue-500 mb-4">
					<svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
					</svg>
				</div>
				<h3 className="text-xl font-bold text-blue-800 mb-3">Connect Your Wallet</h3>
				<p className="text-blue-700 text-center mb-6">Connect your MetaMask wallet to access all features of this dApp.</p>
				<button
					onClick={connect}
					className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center"
				>
					<svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
						<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
					</svg>
					Connect MetaMask
				</button>
			</div>
		</Layout>
	)


	return (
		<Layout>

			<div className="max-w-3xl mx-auto p-6  bg-white rounded-2xl shadow-lg">
				<h2 className="text-2xl font-bold mb-6">Add new good</h2>

				{/* Photo Upload */}
				<div
					{...getRootProps()}
					className={`p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-colors mb-6
          ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50"}`}
				>
					<input {...getInputProps()} />
					{isDragActive ? (
						<p className="text-blue-500 font-medium">Drop the photos here ...</p>
					) : (
						<p className="text-gray-500">Drag & drop some photos here, or click to select</p>
					)}
				</div>

				{/* Preview photos */}
				{photos.length > 0 && (
					<div className="grid grid-cols-3 gap-4 mb-6">
						{photos.map((file, idx) => (
							<div key={idx} className="relative w-full h-32 border rounded-lg overflow-hidden">
								<img
									src={URL.createObjectURL(file)}
									alt={file.name}
									className="object-cover w-full h-full"
								/>
								<button
									type="button"
									onClick={() => {
										setPhotos(photos.filter((_, i) => i !== idx));
									}}
									className="absolute top-1 right-1 bg-gray-500 text-white rounded-full px-2 py-1 text-xs shadow hover:bg-red-600 transition"
								>
									✕
								</button>
							</div>
						))}
					</div>
				)}

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium mb-1">Title</label>
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-medium mb-1">Description</label>
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
							rows={4}
						/>
					</div>

					{ /* Dropdown menu with categories */}
					<div>
						<label className="block text-sm font-medium mb-1">Categories</label>
						<div className="flex flex-wrap gap-2">
							{categories.map((cat) => {
								const active = selectedCategoryIds.some(c => c === cat._id);
								return (
									<button
										key={cat._id}
										onClick={() => toggleCategory(cat)}
										className={`px-3 py-1 rounded-full border border-gray-300 text-sm transition ${active
											? "bg-blue-500 text-white border-blue-500"
											: "bg-white text-gray-600 hover:bg-gray-100"
											}`}
									>
										{cat.label}
									</button>
								);
							})}
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium mb-1">Price</label>
						<input
							type="number"
							value={price}
							onChange={(e) => setPrice(Number(e.target.value))}
							className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
							required
						/>
					</div>

					<button
						type="submit"
						className="w-full py-2 px-4 bg-blue-500 text-white font-medium rounded-xl shadow hover:bg-blue-600 transition"
					>
						Submit
					</button>
				</form>
			</div>
		</Layout>
	);
}
