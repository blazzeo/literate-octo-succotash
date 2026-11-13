import React from "react";
import { GoodType } from "../../context/types";
import { GoodRow } from "./goodRow";

interface GoodsListProps {
	goods: GoodType[] | undefined;
	itemGap?: string;
}

export function GoodsList({
	goods,
	itemGap = "gap-2",
}: GoodsListProps) {
	if (!goods || goods.length === 0) {
		return <p className="text-center text-gray-500">No goods found.</p>;
	}

	return (
		<div className={`flex flex-col ${itemGap}`}>
			{goods.map((good) => (
				<GoodRow key={good._id} good={good} />
			))}
		</div>
	);
}
