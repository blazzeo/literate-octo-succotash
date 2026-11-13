import axios from "axios";
export const VENDORS_SERVICE_URI = import.meta.env.VITE_VENDORS_SERVICE_URI;

export async function getVendorId(email: string) {
	try {
		axios.get(`${VENDORS_SERVICE_URI}/vendors/profile`)
	} catch (error) {
		console.error(error)
		throw error
	}
}
