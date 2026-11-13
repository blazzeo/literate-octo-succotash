import axios from "axios";
import { UserTypeEnum } from "./pages/registerPage";
export const AUTH_SERVICE_URI = import.meta.env.VITE_AUTH_SERVICE_URI;

//	Automatic token refres
axios.interceptors.response.use(undefined, async (error) => {
	const originalRequest = error.config;

	if (
		error.response?.status === 401 &&
		!originalRequest._retry &&
		!originalRequest.url.includes('/users/refresh')
	) {
		originalRequest._retry = true;

		try {
			await axios.post('/api/users/refresh', {}, { withCredentials: true });
			originalRequest.withCredentials = true;
			return axios(originalRequest);
		} catch (refreshError) {
			// logout() or redirect
			return Promise.reject(refreshError);
		}
	}

	return Promise.reject(error);
});

export async function registerCustomer(
	email: string,
	username: string,
	password: string,
	first_name: string,
	last_name: string
) {
	try {
		let response = await axios.post(`${AUTH_SERVICE_URI}/users/customers/register`, {
			credentials: {
				email,
				password,
			},
			username,
			first_name,
			last_name
		})

		return response
	} catch (error) {
		console.error('registerCustomer error: ', error)
		return false
	}
}


export async function getMe() {
	try {
		const response = await axios.get(`${AUTH_SERVICE_URI}/users/me`, {
			withCredentials: true
		});

		return response.data;
	} catch (error) {
		console.error('GetMe Error: ', error)
		return null
	}
}

export async function registerVendor(
	email: string,
	username: string,
	password: string
) {
	try {
		let response = await axios.post(`${AUTH_SERVICE_URI}/users/vendors/register`, {
			credentials: {
				email,
				password,
			},
			username,
		})

		return response
	} catch (error) {
		console.error('registerVendor error: ', error)
		return false
	}
}

export async function login(email: string, password: string) {
	try {
		let response = await axios.post(
			`${AUTH_SERVICE_URI}/users/login`,
			{ email, password },
			{
				withCredentials: true,
				headers: {
					'Content-Type': 'application/json'
				},
			}
		);

		localStorage.setItem('user_id', response.data.user_id)

		return response.status === 303
	} catch (error) {
		console.error('Login Error: ', error);
		return false;
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

export async function verifyEmail(token: string) {
	try {
		const response = await axios.post(`${AUTH_SERVICE_URI}/users/verify_email?token=${token}`);
		return response.data
	} catch (error) {
		console.error('VerifyEmail Error: ', error)
		return false
	}
}

export async function forgetPassword(email: string) {
	try {
		const response = await axios.post(`${AUTH_SERVICE_URI}/users/forgot_pass`, { email });
		return response.data;
	} catch (error) {
		console.error('ForgetPassword Error:', error);
		return false;
	}
}

export async function resetPassword(token: string | null, new_password: string) {
	try {
		if (token === null)
			throw "No token found"

		const response = await axios.post(`${AUTH_SERVICE_URI}/users/reset_pass?token=${token}`, { new_password: new_password });
		return response.data
	} catch (error) {
		console.error('VerifyEmail Error: ', error)
		return false
	}
}


export async function checkAvailableLogin(login: string) {
	try {
		const response = await axios.get(`${AUTH_SERVICE_URI}/check_login/${login}`)

		return response.data
	} catch (error) {
		console.error('checkAvailableLogin Error: ', error)
		throw error
	}
}

export async function checkAvailableEmail(email: string, user_type: UserTypeEnum) {
	try {
		const response = await axios.get(`${AUTH_SERVICE_URI}/check_email/${email}`)

		return response.data
	} catch (error) {
		console.error('checkAvailableEmail Error: ', error)
		throw error
	}
}
