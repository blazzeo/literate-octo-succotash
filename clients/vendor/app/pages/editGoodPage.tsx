import axios from "axios"
import React, { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { toast } from "react-toastify"
import { Category, GoodType } from "./../context/types"
import Layout from "./../components/layout/Layout"
import { X } from "lucide-react"
import { BLOB_SERVICE_URI, deleteImage, fetchGoodBlobManifest } from "./../apis/blob_api"
import { useCategories } from "./../context/categoryContext"
import { GOOD_API_URI } from "./../apis/goods_api"

export default function EditGoodPage() {
	const [good, setGood] = useState<GoodType | null>(null)
	const [newTitle, setNewTitle] = useState("")
	const [newDescription, setNewDescription] = useState("")
	const [newPrice, setNewPrice] = useState(0.0)
	const [newAvailableState, setNewAvailableState] = useState(false)

	const { categories } = useCategories()

	const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

	const [newFiles, setNewFiles] = useState<File[]>([]);
	const [fileCount, setFileCount] = useState(0);
	const [fileSrcs, setFileSrcs] = useState<string[]>([]);

	const location = useLocation()
	const queryParams = new URLSearchParams(location.search)
	const good_id = queryParams.get('id')
	let user_id = localStorage.getItem('user_id')

	const toggleCategory = (category: Category) => {
		if (selectedCategoryIds.includes(category._id)) {
			setSelectedCategoryIds(prev => prev.filter(id => id !== category._id));
		} else {
			setSelectedCategoryIds(prev => [...prev, category._id]);
		}
	};

	useEffect(() => {
		const fetchData = async () => {
			await fetchGood();
			await fetchPhotos();
		};
		fetchData();
	}, [])

	const fetchGood = async () => {
		try {
			let res = await axios.get(`${GOOD_API_URI}/goods/${good_id}`)
			let fetchedGood = res.data as GoodType

			if (user_id != fetchedGood?.vendor_id)
				throw "Can't edit other's good"

			setGood(fetchedGood)
			setNewTitle(fetchedGood?.title!)
			setNewDescription(fetchedGood?.description!)
			setNewPrice(fetchedGood?.price!)
			setNewAvailableState(fetchedGood?.available!)
			setSelectedCategoryIds(fetchedGood?.category_ids)
		} catch (error) {
			console.error(error)
			toast.error(error)
		}
	}

	const fetchPhotos = async () => {
		try {
			let manifest = await fetchGoodBlobManifest(user_id!, good_id!)

			let img_count = manifest.images.length

			setFileCount(img_count)
			setFileSrcs(manifest.images.map(i => i.file))
		} catch (error) {
			console.error(error)
			toast.error(error)
		}
	}

	const updateGoodHandler = async () => {
		try {
			const updatedGood: GoodType = {
				title: newTitle,
				description: newDescription,
				price: newPrice,
				vendor_id: good?.vendor_id!,
				available: newAvailableState,
				times_bought: good?.times_bought!,
				rating: good?.rating!,
				time_added: good?.time_added!,
				category_ids: selectedCategoryIds,
			};

			// 1) Update entity
			await axios.put(`${GOOD_API_URI}/goods/${good_id}`, updatedGood, { withCredentials: true });

			// 2) Prepare manifest + files
			const keep = fileSrcs.map((name, idx) => {
				const m = String(name).match(/^\d{3}_(.+)\.jpg$/);
				const id = m ? m[1] : name.replace(/\.jpg$/i, "");
				return { id, rank: idx + 1 };
			});

			const manifest = {
				keep,
				new: newFiles.map((_, i) => ({ tempId: `tmp_${i}`, rank: keep.length + i + 1 })),
			};

			const formData = new FormData();
			formData.append("manifest", JSON.stringify(manifest));
			newFiles.forEach((file, i) => formData.append(`file:tmp_${i}`, file));

			await axios.put(
				`${BLOB_SERVICE_URI}/file/${user_id}/${good_id}`,
				formData,
				{
					withCredentials: true,
					headers: { "Content-Type": "multipart/form-data" },
				}
			);

			setNewFiles([])

			await fetchPhotos();
			toast.success("Good updated");
		} catch (error) {
			console.error(error);
			toast.error(String(error));
		}
	};

	return (
		<Layout>
			<div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-lg flex flex-col gap-6">
				<h2 className="text-4xl text-center font-bold py-3">Edit Good</h2>

				{/* Images */}
				<label className="text-gray-700 font-semibold mb-1">Images</label>
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
					{fileSrcs.map((src, idx) => {
						const filePath = `${BLOB_SERVICE_URI}/file/goods/${user_id}/${good_id}/${src}`
						return (
							<div key={idx} className="relative inline-block">
								<img src={filePath} alt="Photo" className="h-40 w-60 object-cover rounded" />
								<button className="absolute top-1 right-1 bg-white rounded-full p-1 shadow hover:bg-red-300 transition"
									onClick={async () => {
										try {
											const ok = await deleteImage(filePath)
											if (ok) {
												setFileSrcs(prev => prev.filter((_, i) => i !== idx))
											}
										} catch (error) {
											toast.error("Failed to delete image: ", error)
										}
									}}>
									<X className="w-5 h-5" />
								</button>
							</div>
						)
					})
					}

					{/* Newly selected images */}
					{newFiles.map((file, idx) => {
						const localUrl = URL.createObjectURL(file)
						return (
							<div key={`new-${idx}`} className="relative inline-block">
								<img src={localUrl} alt={file.name} className="h-40 w-60 object-cover rounded" />
								<button
									className="absolute top-1 right-1 bg-white rounded-full p-1 shadow hover:bg-red-300 transition"
									onClick={() => {
										setNewFiles(prev => prev.filter((_, i) => i !== idx))
										URL.revokeObjectURL(localUrl)
									}}
								>
									<X className="w-5 h-5" />
								</button>
							</div>
						)
					})}
				</div>

				{/* File upload */}
				<div className="flex flex-col">
					<label className="text-gray-700 font-semibold mb-1">Upload new images</label>
					<input
						type="file"
						multiple
						title="Upload new images"
						onChange={(e) => {
							if (e.target.files) setNewFiles(prev => [...prev, ...Array.from(e.target.files)]);
						}}
						className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
					/>
				</div>

				{/* Title */}
				<div className="flex flex-col">
					<label className="text-gray-700 font-semibold mb-1">Title</label>
					<input
						type="text"
						value={newTitle}
						onChange={(e) => setNewTitle(e.target.value)}
						className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
					/>
				</div>

				{/* Description */}
				<div className="flex flex-col">
					<label className="text-gray-700 font-semibold mb-1">Description</label>
					<textarea
						value={newDescription}
						onChange={(e) => setNewDescription(e.target.value)}
						rows={4}
						className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
					/>
				</div>

				{/* Price */}
				<div className="flex flex-col">
					<label className="text-gray-700 font-semibold mb-1">Price ($)</label>
					<input
						type="number"
						step="0.01"
						value={newPrice}
						onChange={(e) => setNewPrice(Number(e.target.value))}
						className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
					/>
				</div>

				{/* Available */}
				<div className="flex items-center gap-3">
					<input
						type="checkbox"
						checked={newAvailableState}
						onChange={(e) => setNewAvailableState(e.target.checked)}
						id="available"
						className="w-4 h-4"
					/>
					<label htmlFor="available" className="text-gray-700 font-semibold">
						Available
					</label>
				</div>

				{/* Categories */}
				<div className="flex flex-col">
					<label className="text-gray-700 font-semibold mb-1">Categories</label>
					<div>
						{categories.map((cat) => {
							const active = selectedCategoryIds.some(c => c === cat._id);
							return (
								<button
									key={cat._id}
									onClick={() => toggleCategory(cat)}
									className={`px-3 py-1 m-1 rounded-full border border-gray-300 text-sm transition ${active
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


				{/* Save button */}
				<button
					onClick={updateGoodHandler}
					className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
				>
					Save Changes
				</button>
			</div>
		</Layout>
	);
}
