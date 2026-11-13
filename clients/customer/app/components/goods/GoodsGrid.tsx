import React from "react";
import { GoodCard } from "./goodCard";
import { GoodType } from "../../context/types";

interface GoodsGridProps {
	goods: GoodType[] | undefined;
}

export function GoodsGrid({ goods }: GoodsGridProps) {
	if (!goods || goods.length === 0) {
		return <p className="text-center text-gray-500">No goods found.</p>;
	}

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
			{goods.map((good) => (
				<GoodCard key={good._id} good={good} />
			))}
		</div>
	);
}
