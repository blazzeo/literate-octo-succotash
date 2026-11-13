import React, { useState } from "react";
import { Star, ShoppingCart, XCircle, Tag, EllipsisVerticalIcon } from "lucide-react";
import { GoodType } from "../../context/types";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ConfirmModal } from '../ConfirmModal'
import axios from "axios";
import { useCategories } from "../../context/categoryContext";
import { BLOB_SERVICE_URI } from "../../apis/blob_api"
import { GOOD_API_URI } from "../../apis/goods_api"

interface GoodCardProp {
	good: GoodType
}

export function GoodCard({ good }: GoodCardProp) {
	const good_id = good._id;
	const photoUri = `${BLOB_SERVICE_URI}/file/goods/${good.vendor_id}/${good_id}/main.jpg`
	const goodsUri = `/good?id=${good_id}`

	const { categories } = useCategories()
	const navigate = useNavigate()

	const is_vendors_good = good.vendor_id == localStorage.getItem('user_id')

	const [optionsVisible, setOptionsVisible] = useState(false)
	const [confirmVisible, setConfirmVisible] = useState(false)

	const handleDelete = async (good_id: string) => {
		try {
			await axios.delete(`${GOOD_API_URI}/goods/${good_id}`, { withCredentials: true })
			await axios.delete(`${BLOB_SERVICE_URI}/file/goods/${good_id}`, { withCredentials: true })

			toast.success("Good deleted")
		} catch (error) {
			console.error(error)
			toast.error(error)
		}
	}

	return (
		<div
			className="group w-full sm:max-w-sm md:max-w-md lg:max-w-lg rounded-2xl bg-white overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col relative"
			onClick={() => navigate(goodsUri)}
		>
			{/* === Options button === */}
			{is_vendors_good && (
				<div className="absolute top-3 right-3 z-50"
					onClick={(e) => e.stopPropagation()}>
					<button
						onClick={(e) => {
							e.stopPropagation();
							setOptionsVisible(!optionsVisible);
						}}
						className="p-1 rounded-full bg-gray-100"
					>
						<EllipsisVerticalIcon size={20} />
					</button>

					{optionsVisible && (
						<div className="absolute right-0 mt-2 border border-gray-300 bg-white shadow-lg rounded"
							onClick={(e) => e.stopPropagation()}>
							<Link
								to={`/edit-good?id=${good_id}`}
								className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
								onClick={(e) => {
									e.stopPropagation();
									setOptionsVisible(false);
								}}
							>
								Edit
							</Link>
							<button
								className="block px-4 py-2 text-gray-700 hover:bg-gray-100 w-full text-left"
								onClick={(e) => {
									e.stopPropagation();
									setOptionsVisible(false);
									setConfirmVisible(true);
								}}
							>
								Delete
							</button>
						</div>
					)}
				</div>
			)}

			{/* Image */}
			<div className="relative w-full h-48 overflow-hidden">
				<img
					src={photoUri}
					alt="Good Image"
					className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
					onError={(e) => {
						const target = e.currentTarget;
						target.onerror = null;
						target.src = "/default-picture.jpg";
						target.alt = "no photo";
					}}
				/>
			</div>

			{/* Body */}
			<div className="flex flex-col flex-1 p-4 gap-3">
				{/* Title */}
				<h3 className="text-base font-semibold text-gray-800 line-clamp-2">{good.title}</h3>

				{/* Price + Rating */}
				<div className="flex items-center justify-between">
					<span className="text-xl font-bold text-green-600">{good.price} $</span>
					<span className="flex items-center text-yellow-500 text-sm font-medium">
						<Star size={18} fill="#facc15" stroke="#facc15" className="mr-1" />
						{good.rating.toFixed(1)}
					</span>
				</div>

				{/* Categories */}
				{good.category_ids.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{good.category_ids.map((cat) => (
							<span
								key={cat}
								className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium"
							>
								<Tag size={12} /> {categories.find(c => c._id === cat)?.label}
							</span>
						))}
					</div>
				)}

				{/* Stats */}
				<div className="flex items-center gap-3 text-gray-500 text-xs mt-auto">
					<div className="flex items-center gap-1">
						<ShoppingCart size={14} /> {good.times_bought} bought
					</div>
					{!good.available && (
						<span className="flex items-center gap-1 text-red-500 ml-auto font-medium">
							<XCircle size={14} /> Unavailable
						</span>
					)}
				</div>
			</div>

			{/* Confirm Modal */}
			{confirmVisible && (
				<ConfirmModal
					title={`Delete ${good.title}?`}
					message="Are you sure you want to delete this good? This action cannot be undone."
					onConfirm={() => handleDelete(good_id!)}
					onCancel={() => setConfirmVisible(false)}
				/>
			)}
		</div>
	);
}
