import React from "react";
import { Star, ShoppingCart, CheckCircle, XCircle, Tag } from "lucide-react";

export interface Good {
	id: string,
	title: string,
	description: string,
	price: number,
	vendor_id: string,
	available: boolean,
	times_bought: number,
	rating: number,
	time_added: number,
	category_ids: string[],
}

interface GoodCardProp {
	good: Good
}

export function GoodCard({ good }: GoodCardProp) {
	const photoSrc = `${import.meta.env.VITE_BLOB_SERVICE_URI}/${good.vendor_id}/${good.id}/0.png`

	return (
		<div className="max-w-xs rounded-xl shadow-lg bg-white p-4 hover:shadow-2xl transition-shadow flex flex-col gap-3">
			<img
				src={photoSrc}
				alt="Good Image"
				className="w-full h-40 object-cover rounded-lg mb-2"
			/>
			<h3 className="text-lg font-bold text-gray-800">{good.title}</h3>
			<p className="text-gray-600 text-sm line-clamp-2">{good.description}</p>
			<div className="flex items-center gap-2 mt-1">
				<span className="text-xl font-semibold text-blue-600">{good.price} $</span>
				<span className="flex items-center ml-auto text-yellow-500">
					{Array.from({ length: 5 }).map((_, i) => (
						<Star
							key={i}
							size={18}
							fill={i < Math.round(good.rating) ? "#facc15" : "none"}
							stroke="#facc15"
						/>
					))}
				</span>
			</div>
			<div className="flex items-center gap-2 text-gray-500 text-sm">
				<ShoppingCart size={16} />
				<span>{good.times_bought} bought</span>
				{good.available ? (
					<span className="flex items-center gap-1 text-green-600 ml-auto">
						<CheckCircle size={16} /> Available
					</span>
				) : (
					<span className="flex items-center gap-1 text-red-500 ml-auto">
						<XCircle size={16} /> Unavailable
					</span>
				)}
			</div>
			<div className="flex flex-wrap gap-1 mt-2">
				{good.category_ids.map((cat) => (
					<span
						key={cat}
						className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs"
					>
						<Tag size={12} /> {cat}
					</span>
				))}
			</div>
		</div>
	);
}
