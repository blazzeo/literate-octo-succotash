import React from "react";

type PaginationProps = {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	itemsAmount: number;
	onItemsAmountChange: (amount: number) => void;
};

export function Pagination({
	currentPage,
	totalPages,
	onPageChange,
	itemsAmount,
	onItemsAmountChange,
}: PaginationProps) {
	const amounts = [30, 60, 90];

	return (
		<div className="flex flex-col items-center gap-4">
			{/* Page buttons */}
			<div className="flex gap-2">
				<button
					disabled={currentPage === 0}
					onClick={() => onPageChange(currentPage - 1)}
					className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 disabled:opacity-50"
				>
					Prev
				</button>

				{Array.from({ length: totalPages }, (_, i) => (
					<button
						key={i}
						onClick={() => onPageChange(i)}
						className={`px-3 py-2 rounded-lg border 
              ${i === currentPage
								? "bg-blue-500 text-white"
								: "bg-white hover:bg-gray-100"
							}`}
					>
						{i + 1}
					</button>
				))}

				<button
					disabled={currentPage + 1 >= totalPages}
					onClick={() => onPageChange(currentPage + 1)}
					className="px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50"
				>
					Next
				</button>
			</div>

			{/* Items per page */}
			<div className="flex items-center gap-2">
				<span>Items per page:</span>
				<select
					value={itemsAmount}
					onChange={(e) => onItemsAmountChange(Number(e))}
					className="px-2 py-1 border border-gray-300 rounded-lg"
				>
					{amounts.map((a) => (
						<option key={a} value={a}>
							{a}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}
