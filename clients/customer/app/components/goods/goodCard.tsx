import React, { useEffect, useState } from "react";
import { Star, ShoppingCart, XCircle, Tag } from "lucide-react";
import { BasketGoodCompact, GoodType } from "../../context/types";
import { useCategories } from "../../context/categoryContext";
import { toast } from "react-toastify";
import { add_to_basket, remove_from_basket } from "../../apis/goods_api";
import { BLOB_SERVICE_URI } from "../../apis/blob_api";
import { useBasketInfo } from "../../context/BasketContext";
import { Link } from "react-router-dom";

interface GoodCardProp {
	good: GoodType;
}

export function GoodCard({ good }: GoodCardProp) {
	const good_id = good._id;

	const photoUri = `${BLOB_SERVICE_URI}/file/goods/${good.vendor_id}/${good_id}/main.jpg`
	const goodsUri = `/good?id=${good_id}`

	const [basketGood, setBasketGood] = useState<BasketGoodCompact | undefined>(undefined);

	const { categories } = useCategories()
	const { refreshBasket, goods } = useBasketInfo()

	useEffect(() => {
		// Finds if good is in basket, otherwise returns undefined
		setBasketGood(goods.find(bg => bg._id == good_id))
	}, [goods]);

	const handleAddToCart = async () => {
		try {
			await add_to_basket(good_id!)
			await refreshBasket();
		} catch (error) {
			console.error(error)
			toast.error(error)
		}
	}

	const handleRemoveFromCart = async () => {
		try {
			await remove_from_basket(good_id!)
			await refreshBasket();
		} catch (error) {
			console.error(error)
			toast.error(error)
		}
	}

	return (
		<Link
			to={goodsUri}
			className="group w-full sm:max-w-sm md:max-w-md lg:max-w-lg rounded-2xl bg-white overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col"
		>
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

				{/* Cart Actions */}
				<div className="mt-3">
					{basketGood ? (
						<div className="flex items-center justify-between gap-3">
							<button
								className="px-7 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									handleRemoveFromCart();
								}}
							>
								–
							</button>
							<p className="font-medium">{basketGood.quantity}</p>
							<button
								className="px-7 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									handleAddToCart();
								}}
							>
								+
							</button>
						</div>
					) : (
						<button
							className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-green-500 text-white font-medium shadow-sm hover:bg-green-600 active:scale-[0.98] transition-all duration-200"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								handleAddToCart();
							}}
						>
							<ShoppingCart className="w-5 h-5" />
							Add to Cart
						</button>
					)}
				</div>
			</div>
		</Link>
	);
}
