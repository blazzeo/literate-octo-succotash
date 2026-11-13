import axios from "axios";
import { CustomerInfo } from "../context/types";

export const CUSTOMERS_SERVICE_URI = import.meta.env.VITE_CUSTOMERS_SERVICE_URI;

export async function fetchProfile(user_id: string): Promise<CustomerInfo> {
	let res = await axios.get(`${CUSTOMERS_SERVICE_URI}/customers/profile/${user_id}`);

	return res.data;
}

export async function updateProfile(data: CustomerInfo) {
	let res = await axios.patch(`${CUSTOMERS_SERVICE_URI}/customers/profile`, data, {
		withCredentials: true,
	});

	return res.data;
}
