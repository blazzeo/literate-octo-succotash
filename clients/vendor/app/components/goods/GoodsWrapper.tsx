import React, { useEffect, useState } from "react";
import { GoodsGrid } from "./GoodsGrid"
import { Filters, GoodType } from "../../context/types";
import { FilterIcon, Grid, List } from "lucide-react";
import { toast } from "react-toastify";
import { Pagination } from "./Pagination";
import Filter from "../Filter";
import { GoodsList } from "./GoodsList";
import { useCategories } from "../../context/categoryContext";
import { fetch_goods_amount_filters, fetch_goods_filters } from "../../apis/goods_api";

type GoodsViewModeVariants = "list" | "grid";
export type ItemsAmountVariants = 30 | 60 | 90;

type GoodsWrapperProps = {
	vendor_id: string | null
};

export default function GoodsWrapper({ vendor_id }: GoodsWrapperProps) {
	const [goodsViewMode, setGoodsViewMode] = useState<GoodsViewModeVariants>("list")
	const [goods, setGoods] = useState<GoodType[] | undefined>(undefined)
	const [page, setPage] = useState<number>(0)
	const [itemsAmount, setItemsAmount] = useState<ItemsAmountVariants>(30)
	const [filters, setFilters] = useState<Filters>({ vendor_id: vendor_id, min_price: null, max_price: null, category_ids: null, name: null })
	const [goodsTotalCount, setGoodsTotalCount] = useState<number>(0)
	const [filterVisible, setFilterVisible] = useState<boolean>(false)

	const { categories } = useCategories()

	useEffect(() => {
		fetchGoodsAmount()
	}, [filters])

	const fetchGoodsAmount = async () => {
		try {
			let goodsAmount = await fetch_goods_amount_filters(filters)

			setGoodsTotalCount(goodsAmount)
		} catch (error) {
			console.error(error)
			toast.error(error)
		}
	}

	useEffect(() => {
		fetchGoods()
	}, [page, itemsAmount, filters])

	const fetchGoods = async () => {
		try {
			let fetchedGoods = await fetch_goods_filters(page, itemsAmount, filters);

			setGoods(fetchedGoods)
		} catch (error) {
			console.error(error)
			toast.error(error)
		}
	}

	const totalPages = Math.ceil(goodsTotalCount / itemsAmount);

	return (
		<div className="flex flex-col min-h-screen">
			{/* Header */}
			<div className="flex justify-between w-full px-10 py-4 border-b border-gray-200">
				<button
					onClick={() => setFilterVisible(!filterVisible)}
					className={`flex rounded-xl border border-gray-300 shadow-sm px-6 py-2 transition 
          ${filterVisible ? "bg-blue-500 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
				>
					<FilterIcon className="h-5 w-5" />
					<span className="hidden sm:inline">Filter</span>
				</button>

				<div className="flex rounded-2xl border border-gray-300 shadow-sm overflow-hidden">
					<button
						onClick={() => setGoodsViewMode("list")}
						className={`px-3 py-2 flex items-center gap-2 transition 
            ${goodsViewMode === "list" ? "bg-blue-500 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
					>
						<List className="h-5 w-5" />
						<span className="hidden sm:inline">List</span>
					</button>
					<button
						onClick={() => setGoodsViewMode("grid")}
						className={`px-3 py-2 flex items-center gap-2 transition 
            ${goodsViewMode === "grid" ? "bg-blue-500 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
					>
						<Grid className="h-5 w-5" />
						<span className="hidden sm:inline">Grid</span>
					</button>
				</div>
			</div>

			{/* Main content: filters + lists */}
			<div className="flex flex-1 gap-4 w-5/6 mx-auto py-4">
				{filterVisible && (
					<div className="w-1/5">
						<Filter
							categories={categories}
							vendor_id={vendor_id}
							onApply={setFilters}
							initialFilters={filters}
						/>
					</div>
				)}

				<div className={filterVisible ? "flex-1 flex flex-col" : "w-full flex flex-col"}>
					{goods && goods.length > 0 ? (
						goodsViewMode === "grid" ? <GoodsGrid goods={goods} /> : <GoodsList goods={goods} />
					) : (
						<div className="flex-1 flex items-center justify-center text-gray-400">
							No items found
						</div>
					)}
				</div>
			</div>

			{/* Pagination */}
			<div className="w-full px-10 py-4 border-t border-gray-200">
				<Pagination
					currentPage={page}
					totalPages={totalPages}
					onPageChange={setPage}
					itemsAmount={itemsAmount}
					onItemsAmountChange={(val) => {
						setItemsAmount(val as ItemsAmountVariants);
						setPage(0);
					}}
				/>
			</div>
		</div>
	)
}
