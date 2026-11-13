import axios from "axios";
import { Filters, GoodType } from "../context/types";

export const GOOD_API_URI = import.meta.env.VITE_GOODS_SERVICE_URI

type VendorGoodsResponse = [number, GoodType[]];

export async function fetchGoods(page: number, amount: number): Promise<VendorGoodsResponse> {
	try {
		let res = await axios.get(`${GOOD_API_URI}/goods/${page}/${amount}/`)

		return res.data as VendorGoodsResponse
	} catch (error) {
		console.error(error)
		throw error
	}
}

export async function upload_good(title: string, description: string, categoryIds: string[], price: number | undefined) {
	try {
		let good: GoodType = {
			title: title,
			description: description,
			price: price ?? 0,
			vendor_id: localStorage.getItem('user_id')!,
			available: true,
			times_bought: 0,
			rating: 0,
			time_added: { $date: new Date().toISOString() },
			category_ids: categoryIds
		}

		let res = await axios.post(`${GOOD_API_URI}/goods/`, good, { withCredentials: true })

		return res.data;
	} catch (error) {
		console.error("Good upload failed", error);
		throw error;
	}
}

export async function fetch_goods_amount_filters(filters: Filters | undefined) {
	try {
		const params: Record<string, any> = {};

		if (filters) {
			if (filters.name) params.name = filters.name;
			if (filters.min_price != null) params.min_price = filters.min_price;
			if (filters.max_price != null) params.max_price = filters.max_price;
			if (filters.category_ids && filters.category_ids.length > 0)
				params.category_ids = filters.category_ids.join(","); // CSV
			if (filters.vendor_id) params.vendor_id = filters.vendor_id;
		}

		const response = await axios.get(
			`${GOOD_API_URI}/goods/amount`,
			{ params }
		);

		return response.data;
	} catch (error) {
		console.error(error);
		throw error
	}
}


export async function fetch_goods_filters(page: number, itemsAmount: number, filters: Filters | undefined) {
	try {
		const params: Record<string, any> = {};

		if (filters) {
			if (filters.name) params.name = filters.name;
			if (filters.min_price != null) params.min_price = filters.min_price;
			if (filters.max_price != null) params.max_price = filters.max_price;
			if (filters.category_ids && filters.category_ids.length > 0)
				params.category_ids = filters.category_ids.join(","); // CSV
			if (filters.vendor_id) params.vendor_id = filters.vendor_id;
		}

		const response = await axios.get(
			`${GOOD_API_URI}/goods/${page}/${itemsAmount}`,
			{ params }
		);

		return response.data;
	} catch (error) {
		console.error(error);
		throw error
	}
};

