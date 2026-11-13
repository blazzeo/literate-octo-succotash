export interface GoodType {
	_id?: string,
	title: string,
	description: string,
	price: number,
	vendor_id: string,
	available: boolean,
	times_bought: number,
	rating: number,
	time_added: string,
	category_ids: string[],
}

export interface Category {
	_id: string,
	label: string,
	parent_id: string | null,
}

export interface Basket {
	id: string,
	customer_id: string,
	goods: null | string[], // Refs to goods by ID
}

export interface Filters {
	name: string | null,
	min_price: number | null,
	max_price: number | null,
	category_ids: string[] | null,
	vendor_id: string | null,
}

export interface VendorInfo {
	id: string;
	login: string;
	email: string;
	avatar_uri: string | null;
	billing_address: string;
	wallets: string[];
}

export enum UserType {
	customer = 'customer',
	vendor = 'vendor',
	admin = 'admin'
}

export interface User {
	id: string;
	name: string | null;
	login: string;
	email: string;
	role: UserType;
}

export interface ImageManifest {
	id: string,
	file: string,
	rank: number,
	main: boolean,
}

export interface BlobManifest {
	images: ImageManifest[],
	updated_at: string
}
