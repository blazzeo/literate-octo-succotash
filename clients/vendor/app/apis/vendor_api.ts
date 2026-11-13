import axios from "axios";
import { VendorInfo } from "../context/types";

export const VENDORS_SERVICE_URI = import.meta.env.VITE_VENDORS_SERVICE_URI;

export async function updateProfile(data: VendorInfo) {
	let res = await axios.patch(`${VENDORS_SERVICE_URI}/vendor/profile`, data, {
		withCredentials: true,
	});

	return res.data;
}

export async function getVendorInfo(vendor_id: string): Promise<VendorInfo> {
	try {
		let res = await axios.get(`${VENDORS_SERVICE_URI}/vendor/profile/${vendor_id}`)
		return res.data as VendorInfo
	} catch (error) {
		console.error(error)
		throw error
	}
}
