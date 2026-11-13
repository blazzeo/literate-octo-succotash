import React, { useEffect, useState } from "react";
import { Star, ShoppingCart, XCircle, Tag } from "lucide-react";
import { BasketGoodCompact, GoodType } from "../../context/types";
import { useCategories } from "../../context/categoryContext";
import { toast } from "react-toastify";
import { add_to_basket, remove_from_basket } from "../../apis/goods_api";
import { useBasketInfo } from "../../context/BasketContext";
import { BLOB_SERVICE_URI } from "../../apis/blob_api";
import { Link } from "react-router-dom";

interface GoodRowProp {
	good: GoodType;
}

export function GoodRow({ good }: GoodRowProp) {
	const good_id = good._id
	const photoUri = `${BLOB_SERVICE_URI}/file/goods/${good.vendor_id}/${good_id}/main.jpg`;
	const goodsUri = `/good?id=${good_id}`;

	const [basketGood, setBasketGood] = useState<BasketGoodCompact | undefined>(undefined);

	const { categories } = useCategories()
	const { refreshBasket, goods } = useBasketInfo()

	useEffect(() => {
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
			className="w-full relative rounded-2xl bg-white p-2 pr-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-6 border border-gray-100"
		>
			{/* Thumbnail */}
			<div className="flex-shrink-0 overflow-hidden">
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

				<div className="flex items-center gap-3 text-gray-500 text-sm mt-1">
					<ShoppingCart size={16} />
					<span>{good.times_bought} bought</span>
				</div>

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

				{/* Cart Actions */}
				<div className="mt-1">
					{basketGood ? (
						<div className="flex items-center gap-2">
							<button
								className="px-5 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									handleRemoveFromCart();
								}}
							>
								–
							</button>
							<span className="font-medium">{basketGood.quantity}</span>
							<button
								className="px-5 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition"
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
							className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white font-medium shadow-sm hover:bg-green-600 active:scale-[0.98] transition-all duration-200"
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
