import axios from "axios";
import { Filters } from "../context/types";

export const GOODS_SERVICE_URI = (import.meta as any).env.VITE_GOODS_SERVICE_URI;

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
			`${GOODS_SERVICE_URI}/goods/amount`,
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
			`${GOODS_SERVICE_URI}/goods/${page}/${itemsAmount}`,
			{ params }
		);

		return response.data;
	} catch (error) {
		console.error(error);
		throw error
	}
};

export async function add_to_basket(good_id: string) {
	try {
		let res = await axios.post(`${GOODS_SERVICE_URI}/basket/${good_id}`, {}, { withCredentials: true })

		return res.data
	} catch (error) {
		console.error(error)
		throw error
	}
}

export async function remove_from_basket(good_id: string) {
	try {
		let res = await axios.delete(`${GOODS_SERVICE_URI}/basket/${good_id}`, { withCredentials: true })

		return res.data
	} catch (error) {
		console.error(error)
		throw error
	}
}

export async function fetch_basket(page: number = 0, amount: number = 30) {
	try {
		let res = await axios.get(`${GOODS_SERVICE_URI}/basket/${page}/${amount}`, { withCredentials: true })

		return res.data
	} catch (error) {
		console.error(error)
		throw error
	}
}

