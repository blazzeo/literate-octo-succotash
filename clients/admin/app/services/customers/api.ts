import axios from "axios";
import { CustomerInfo } from "./pages/profile";
export const CUSTOMERS_SERVICE_URI = import.meta.env.VITE_CUSTOMERS_SERVICE_URI;
export const BLOB_SERVICE_URI = import.meta.env.VITE_BLOB_SERVICE_URI;

export async function fetchProfile() {
	let res = await axios.get(`${CUSTOMERS_SERVICE_URI}/customers/profile/${localStorage.getItem("user_id")}`, {
		withCredentials: true,
	});

	return res.data;
}

export async function updateProfile(data: CustomerInfo) {
	let res = await axios.patch(`${CUSTOMERS_SERVICE_URI}/customers/profile`, data, {
		withCredentials: true,
	});

	return res.data;
}

export async function uploadAvatar(file: File, userId: string) {
	let formData = new FormData();
	formData.append("file", file);

	let res = await axios.post(`${BLOB_SERVICE_URI}/file/avatars/${userId}.png`, formData, {
		withCredentials: true,
	});

	return res.data;
}
