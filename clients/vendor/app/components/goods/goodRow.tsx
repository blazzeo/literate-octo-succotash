import React, { useState } from "react";
import { Star, ShoppingCart, XCircle, Tag, EllipsisVerticalIcon } from "lucide-react";
import { GoodType } from "../../context/types";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { ConfirmModal } from "../ConfirmModal";
import { useCategories } from "../../context/categoryContext";
import { BLOB_SERVICE_URI } from "../../apis/blob_api"
import { GOOD_API_URI } from "../../apis/goods_api"

interface GoodRowProp {
	good: GoodType;
}

export function GoodRow({ good }: GoodRowProp) {
	const good_id = good._id;
	const photoUri = `${BLOB_SERVICE_URI}/file/goods/${good.vendor_id}/${good_id}/main.jpg`
	const goodsUri = `/good?id=${good_id}`;

	const { categories } = useCategories()
	const navigate = useNavigate()

	const is_vendors_good = good.vendor_id == localStorage.getItem('user_id')

	const [optionsVisible, setOptionsVisible] = useState(false)
	const [confirmVisible, setConfirmVisible] = useState(false)

	const handleDelete = async (good_id: string) => {
		try {
			await axios.delete(`${GOOD_API_URI}/goods/${good_id}`, { withCredentials: true })
			await axios.delete(`${BLOB_SERVICE_URI}/file/goods/${good_id}`)

			toast.success("Good deleted")
		} catch (error) {
			console.error(error)
			toast.error(error)
		}
	}

	return (
		<div
			onClick={() => navigate(goodsUri)}
			className="relative flex-1 rounded-xl shadow-sm bg-white px-4 py-2 hover:shadow-lg transition-shadow flex items-center gap-4 cursor-pointer"
		>

			{/* === Options button === */}
			{is_vendors_good && (
				<div className="absolute top-2 right-2 z-50">
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
						<div className="absolute right-0 mt-2 border border-gray-300 bg-white shadow-lg rounded">
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

			{/* Thumbnail */}
			<div className="flex-shrink-0">
				<img
					src={photoUri}
					alt="Good Image"
					className="w-32 h-32 object-cover rounded-xl border border-gray-200"
					onError={(e) => {
						const target = e.currentTarget;
						target.onerror = null;
						target.src = "/default-picture.jpg";
						target.alt = "no photo";
					}}
				/>
			</div>

			{/* Info Section */}
			<div className="flex-1 flex flex-col gap-2">
				<h3 className="text-base md:text-lg font-semibold text-gray-800 line-clamp-1">
					{good.title}
				</h3>
				<p className="text-gray-600 text-sm line-clamp-2">{good.description}</p>

				<div className="flex items-center gap-3 text-gray-500 text-sm mt-1">
					<ShoppingCart size={16} />
					<span>{good.times_bought} bought</span>
				</div>

				{good.category_ids.length > 0 && (
					<div className="flex flex-wrap gap-2 mt-1">
						{good.category_ids.map((cat) => (
							<span
								key={cat}
								className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium"
							>
								<Tag size={12} /> {categories.find((c) => c._id === cat)?.label}
							</span>
						))}
					</div>
				)}
			</div>

			{/* Actions Section */}
			<div className="flex flex-col items-end gap-3 min-w-[120px]">
				{/* Rating */}
				<div className="flex items-center text-yellow-500 text-sm">
					{Array.from({ length: 5 }).map((_, i) => (
						<Star
							key={i}
							size={16}
							fill={i < Math.round(good.rating) ? "#facc15" : "none"}
							stroke="#facc15"
						/>
					))}
					<span className="ml-2 font-medium">{good.rating.toFixed(1)}</span>
				</div>

				{/* Price or Unavailable */}
				{good.available ? (
					<span className="text-lg font-bold text-green-600">{good.price} $</span>
				) : (
					<span className="flex items-center gap-1 text-red-500 text-sm font-medium">
						<XCircle size={16} /> Unavailable
					</span>
				)}
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
