import axios from "axios";
import { BasketGood } from "../context/types";

export const ORDERS_SERVICE_URI = (import.meta as any).env.VITE_ORDERS_SERVICE_URI;

export enum OrderStatus {
	Created = "Created",
	Approved = "Approved",
	Paid = "Paid",
	Sold = "Sold",
	Cancelled = "Cancelled",
	Delivered = "Delivered",
}

function formatStatus(status: string | undefined): string {
	if (status === undefined || status === null) return 'Undefined';
	switch (status) {
		case OrderStatus.Created:
			return 'Created';
		case OrderStatus.Approved:
			return 'Approved';
		case OrderStatus.Paid:
			return 'Paid';
		case OrderStatus.Sold:
			return 'Sold';
		case OrderStatus.Cancelled:
			return 'Cancelled';
		case OrderStatus.Delivered:
			return 'Delivered';
		default:
			return `Status ${status}`;
	}
}

export async function createOrder(
	vendor_id: string,
	billing_address: string,
	shipping_address: string,
	cart: BasketGood[]
) {
	try {
		const order = {
			vendor_id,
			billing_address,
			shipping_address,
			goods: cart.map(item => ({
				good_id: item.good._id,
				amount: item.quantity,
				price_per_unit: item.good.price,
			}))
		};

		const res = await axios.post(`${ORDERS_SERVICE_URI}/orders`, order, { withCredentials: true });

		let order_id = res.data;

		return order_id;
	} catch (error) {
		throw error
	}
}

export async function getOrders(
	vendor_id: string,
	stage: OrderStatus | null
) {
	try {
		let url = `${ORDERS_SERVICE_URI}/orders?user_id=${vendor_id}`;

		if (stage !== null) {
			url += `&stage=${formatStatus(stage)}`;
		}

		const res = await axios.get(url, { withCredentials: true });
		let orders = res.data;
		return orders;
	} catch (error) {
		throw error
	}
}
