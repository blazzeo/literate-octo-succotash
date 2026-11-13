import axios from "axios";
import { BlobManifest } from "../context/types";

export const BLOB_SERVICE_URI = import.meta.env.VITE_BLOB_SERVICE_URI;

export async function fetch_good_blob_manifest(user_id: string, good_id: string): Promise<BlobManifest> {
	try {
		let res = await axios.get(`${BLOB_SERVICE_URI}/info/goods/${user_id}/${good_id}`)

		return res.data as BlobManifest
	} catch (error) {
		console.error(error)
		throw error
	}
}

export async function upload_avatar(file: File, userId: string) {
	let formData = new FormData();
	formData.append("file", file);

	let res = await axios.post(`${BLOB_SERVICE_URI}/file/avatars/${userId}.png`, formData, {
		withCredentials: true,
	});

	return res.data;
}
