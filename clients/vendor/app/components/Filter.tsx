import React, { useState } from "react";
import { Category, Filters } from "../context/types";
import { CircleX } from "lucide-react";

type FilterProps = {
	categories: Category[];
	vendor_id: string | null,
	initialFilters?: Filters;
	onApply: (filters: Filters) => void;
};

export default function Filter({
	categories,
	vendor_id,
	initialFilters,
	onApply,
}: FilterProps) {
	const [name, setName] = useState<string>(initialFilters?.name ?? "");
	const [minPrice, setMinPrice] = useState<number | "">(initialFilters?.min_price ?? "");
	const [maxPrice, setMaxPrice] = useState<number | "">(initialFilters?.max_price ?? "");
	const [rating, setRating] = useState<number | undefined>(undefined)
	const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
		initialFilters?.category_ids ?? []
	);

	const toggleCategory = (category: Category) => {
		if (selectedCategoryIds.includes(category._id)) {
			setSelectedCategoryIds(prev => prev.filter(id => id !== category._id));
		} else {
			setSelectedCategoryIds(prev => [...prev, category._id]);
		}
	};

	const handleApply = () => {
		const filters: Filters = {
			name: name.trim() || null,
			min_price: minPrice === "" ? null : Number(minPrice),
			max_price: maxPrice === "" ? null : Number(maxPrice),
			category_ids: selectedCategoryIds.length > 0 ? selectedCategoryIds : null,
			vendor_id: vendor_id
		};
		onApply(filters);
	};

	return (
		<div className="p-4 border border-gray-200 rounded-2xl shadow-sm flex flex-col gap-4 w-full max-w-md">
			{/* Name filter */}
			<div className="flex flex-col gap-1">
				<div className="flex justify-between">
					<label className="text-sm text-gray-600">Name</label>
					{name.length > 0 && <button onClick={() => setName('')}><CircleX className="opacity-50 hover:opacity-90 transition" size={18} /></button>}
				</div>
				<input
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Search by name..."
					className="border border-gray-300 rounded-lg px-3 py-2"
				/>
			</div>

			{/* Price filter */}
			<div className="flex flex-col gap-2">
				<div className="flex flex-col gap-1 flex-1">
					<label className="text-sm text-gray-600">Min Price</label>
					<input
						type="number"
						value={minPrice}
						onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : "")}
						placeholder="0"
						className="border border-gray-300 rounded-lg px-3 py-2"
					/>
				</div>
				<div className="flex flex-col gap-1 flex-1">
					<label className="text-sm text-gray-600">Max Price</label>
					<input
						type="number"
						value={maxPrice}
						onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : "")}
						placeholder="0"
						className="border border-gray-300 rounded-lg px-3 py-2"
					/>
				</div>
			</div>

			{/* Price filter */}
			<div className="flex flex-col gap-2">
				<div className="flex justify-between">
					<label className="text-sm text-gray-600">Rating</label>
					<span>{rating}</span>
					{rating != undefined && <button onClick={() => setRating(undefined)}><CircleX className="opacity-50 hover:opacity-90 transition" size={18} /></button>}
				</div>
				<input
					type="range"
					value={rating}
					onChange={(e) => setRating(e.target.value)}
					min={0}
					max={5}
					step={0.1}
					placeholder="Search by name..."
					className="border border-gray-300 rounded-lg px-3 py-2"
				/>
			</div>

			{/* Categories */}
			<div className="flex flex-col gap-2">
				<div className="flex justify-between">
					<label className="text-sm text-gray-600">Categories</label>
					{selectedCategoryIds.length > 0 && <button onClick={() => setSelectedCategoryIds([])}><CircleX className="opacity-50 hover:opacity-90 transition" size={18} /></button>}
				</div>
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

			{/* Apply button */}
			<button
				onClick={handleApply}
				className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
			>
				Apply Filters
			</button>
		</div>
	);
}
