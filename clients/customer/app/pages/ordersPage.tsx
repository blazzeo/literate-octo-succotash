import React, { useEffect, useMemo, useState } from 'react';
import { useMetaMask } from '../context/Metamask';
import { getOrders, OrderStatus } from '../apis/orders_api';
import Layout from '../components/Layout/Layout';

interface OrderGood {
	good_id: string,
	amount: number,
	price_per_unit: number
}

type VendorOrder = Record<string, any> & {
	id?: string;
	customer_id: string;
	vendor_id: string;
	billing_address: string;
	shipping_address: string;
	status: string;
	goods: OrderGood[];
};

const STATUS_TABS: Array<{ key: OrderStatus | null; label: string }> = [
	{ key: null, label: 'All' },
	{ key: OrderStatus.Created, label: 'Planned' },
	{ key: OrderStatus.Approved, label: 'Approved' },
	{ key: OrderStatus.Paid, label: 'Paid' },
	{ key: OrderStatus.Sold, label: 'Sold' },
	{ key: OrderStatus.Delivered, label: 'Delivered' },
	{ key: OrderStatus.Cancelled, label: 'Cancelled' },
];

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
		case OrderStatus.Delivered:
			return 'Delivered';
		case OrderStatus.Cancelled:
			return 'Cancelled';
		default:
			return `${status}`;
	}
}

function formatNextStage(status: string | undefined): string {
	if (status === undefined || status === null) return 'Undefined';
	switch (status) {
		case OrderStatus.Approved:
			return 'Deposit';
		case OrderStatus.Sold:
			return 'Mark delivered';
		default:
			return `${status}`;
	}
}

export default function OrdersPage() {
	const { cancelOrder, depositToOrder, refreshOrders, markOrderDelivered } = useMetaMask();
	const [activeTab, setActiveTab] = useState<OrderStatus | null>(null);
	const [items, setItems] = useState<VendorOrder[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const vendorId = useMemo(() => {
		return localStorage.getItem('user_id') || '';
	}, []);

	const load = async (status: OrderStatus | null) => {
		if (!vendorId) return;
		setIsLoading(true);
		setError(null);
		try {
			const data = await getOrders(vendorId, status);
			setItems(Array.isArray(data) ? data : []);
		} catch (e: any) {
			setError(e?.message || 'Cant load orders');
			setItems([]);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		load(activeTab);
		refreshOrders(activeTab).catch(() => void 0);
	}, [activeTab]);

	const handleNextStage = async (order: VendorOrder) => {
		const address = order.billing_address;
		if (!address) return;

		try {
			setIsLoading(true);
			// simple phases transitions for customer
			if (order.status === OrderStatus.Approved) {
				const totalPrice = order.goods?.reduce((sum, item) => sum + (item.price_per_unit * item.amount), 0) || 0;
				await depositToOrder(address, totalPrice.toString());
			} else if (order.status === OrderStatus.Sold) {
				await markOrderDelivered(address);
			}
			await load(activeTab);
		} catch (e) {
			// no - op
		} finally {
			setIsLoading(false);
		}
	};

	const handleCancel = async (order: VendorOrder) => {
		const address = order.billing_address;
		if (!address) return;
		try {
			setIsLoading(true);
			await cancelOrder(address);
			await load(activeTab);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Layout>
			<div className="mx-auto max-w-7xl px-4 py-8">
				<h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Orders</h1>

				<div className="flex space-x-2 overflow-x-auto rounded-lg bg-gray-100 dark:bg-gray-800 p-1 mb-6">
					{STATUS_TABS.map(tab => (
						<button
							key={tab.label}
							className={[
								'whitespace-nowrap rounded-md px-4 py-2 text-sm transition',
								activeTab === tab.key
									? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
									: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-gray-600/70'
							].join(' ')}
							onClick={() => setActiveTab(tab.key)}
						>
							{tab.label}
						</button>
					))}
				</div>

				<div className="mb-4 flex items-center justify-between">
					<div className="text-sm text-gray-500 dark:text-gray-400">
						{isLoading ? 'Loading…' : `Found: ${items.length}`}
						{error ? (
							<span className="ml-2 text-red-600 dark:text-red-400">{error}</span>
						) : null}
					</div>
					<button
						className="rounded-md bg-gray-900 dark:bg-gray-700 text-white px-3 py-2 text-sm hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50"
						onClick={() => load(activeTab)}
						disabled={isLoading}
					>
						Update
					</button>
				</div>

				<div className="space-y-4">
					{items.map((order) => {
						const id = (order.id as string) || '—';
						const statusText = formatStatus(order.status);
						const canCancel = order.status !== OrderStatus.Cancelled && order.status !== OrderStatus.Sold && order.status !== OrderStatus.Delivered;
						const canNext = order.status === OrderStatus.Approved || order.status === OrderStatus.Sold;
						const totalPrice = order.goods?.reduce((sum, item) => sum + (item.price_per_unit * item.amount), 0) || 0;

						return (
							<div key={`${id}`} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
								<div className="mb-4 flex items-start justify-between">
									<div>
										<div className="text-sm text-gray-500 dark:text-gray-400">Order</div>
										<div className="font-medium text-gray-900 dark:text-white break-all">ID: {id}</div>
									</div>
									<span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
										{statusText}
									</span>
								</div>

								{order.goods && order.goods.length > 0 && (
									<div className="mb-4">
										<div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Goods in order:</div>
										<div className="space-y-2">
											{order.goods.map((good, index) => (
												<div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
													<div className="flex-1">
														<div className="text-sm font-medium text-gray-900 dark:text-white">
															Good ID: <span className="font-mono text-xs">{good.good_id}</span>
														</div>
														<div className="text-sm text-gray-600 dark:text-gray-400">
															Amount: <span className="font-medium text-gray-900 dark:text-white">{good.amount}</span>
														</div>
													</div>
													<div className="text-right">
														<div className="text-sm text-gray-600 dark:text-gray-400">Price per unit</div>
														<div className="text-sm font-medium text-gray-900 dark:text-white">
															{good.price_per_unit}
														</div>
														<div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
															Total: {good.price_per_unit * good.amount}
														</div>
													</div>
												</div>
											))}
										</div>
									</div>
								)}

								<div className="space-y-2 text-sm mb-4">
									<div className="flex justify-between text-gray-600 dark:text-gray-400">
										<span>Contract address</span>
										<span className="ml-2 font-mono text-gray-900 dark:text-white break-all text-xs">
											{order.billing_address || '—'}
										</span>
									</div>
									<div className="flex justify-between text-gray-600 dark:text-gray-400">
										<span>Total order value</span>
										<span className="ml-2 text-gray-900 dark:text-white font-medium">
											{totalPrice}
										</span>
									</div>
								</div>

								<div className="mt-4 flex items-center gap-2">
									{canNext && (
										<button
											onClick={() => handleNextStage(order)}
											className="inline-flex items-center disabled:bg-gray-500 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
											disabled={isLoading || !order.billing_address}
										>
											{formatNextStage(order.status)}
										</button>
									)}
									{canCancel && (
										<button
											onClick={() => handleCancel(order)}
											className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:bg-red-600 disabled:opacity-50 transition-colors"
											disabled={isLoading || !order.billing_address}
										>
											Cancel
										</button>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</Layout>
	);
}


