import axios from "axios";

export const AUTH_SERVICE_URI = import.meta.env.VITE_AUTH_SERVICE_URI;
export const AUTH_CLIENT_URI = import.meta.env.VITE_AUTH_CLIENT_URI;

export async function getMe() {
	try {
		const response = await axios.get(`${AUTH_SERVICE_URI}/users/me`, {
			withCredentials: true
		});

		return response.data;
	} catch (error) {
		console.error('GetMe Error: ', error)
		throw error
	}
}

export async function refresh_token() {
	try {
		let response = await axios.post(`${AUTH_SERVICE_URI}/users/refresh`,
			{},
			{ withCredentials: true, }
		)

		return response.status == 200
	} catch (error) {
		console.error('Refresh Error: ', error)
		return false
	}
}

export async function logout() {
	try {
		let response = await axios.post(
			`${AUTH_SERVICE_URI}/users/logout`,
			{},
			{ withCredentials: true, }
		)

		return response.status == 200
	} catch (error) {
		console.error('Refresh Error: ', error)
		return false
	}
}
