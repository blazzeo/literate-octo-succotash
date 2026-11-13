import React, { useEffect, useState } from 'react';
import { BasketGood, VendorInfo } from '../../context/types';
import { remove_from_basket, add_to_basket } from '../../apis/goods_api';
import { BLOB_SERVICE_URI } from '../../apis/blob_api';
import { getVendorInfo } from '../../apis/vendors_api';
import { toast } from 'react-toastify';

interface CartItemProps {
	item: BasketGood;
	onRemove: (goodId: string) => void;
	onUpdateQuantity: (goodId: string, newQuantity: number) => void;
}

export default function CartItem({ item, onRemove, onUpdateQuantity }: CartItemProps) {
	const [vendor, setVendor] = useState<VendorInfo | undefined>(undefined);

	useEffect(() => {
		const fetchData = async () => {
			await fetchVendor(item.good.vendor_id)
		};

		fetchData()
	}, [])

	const handleRemove = async () => {
		try {
			await remove_from_basket(item.good._id);
			onRemove(item.good._id);
		} catch (error) {
			console.error('Error removing item from cart:', error);
		}
	};

	const handleIncreaseQuantity = async () => {
		try {
			await add_to_basket(item.good._id);
			onUpdateQuantity(item.good._id, item.quantity + 1);
		} catch (error) {
			console.error('Error increasing quantity:', error);
		}
	};

	const handleDecreaseQuantity = async () => {
		try {
			if (item.quantity > 1) {
				await remove_from_basket(item.good._id);
				onUpdateQuantity(item.good._id, item.quantity - 1);
			} else {
				// If quantity is 1, remove the item completely
				await handleRemove();
			}
		} catch (error) {
			console.error('Error decreasing quantity:', error);
		}
	};

	const fetchVendor = async (vendor_id: string) => {
		try {
			let vendor = await getVendorInfo(vendor_id)

			setVendor(vendor)
		} catch (error) {
			console.error(error)
			toast.error(error)
		}
	}

	return (
		<div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-2 pr-6 border border-gray-200">
			<div className="flex items-center space-x-4">
				{/* Image of good */}
				<div className="flex-shrink-0">
					<img
						src={`${BLOB_SERVICE_URI}/file/goods/${item.good.vendor_id}/${item.good._id}/main.jpg`}
						alt={item.good.title}
						className="w-25 h-25 object-cover rounded-lg"
						onError={(e) => {
							const target = e.currentTarget;
							target.onerror = null;
							target.src = "/default-picture.jpg";
							target.alt = "no photo";
						}}
					/>
				</div>

				{/* Info about good */}
				<div className="flex-1 min-w-0">
					<h3 className="text-lg font-semibold text-gray-900 truncate">
						{item.good.title}
					</h3>
					<p className="text-sm text-gray-600 mt-1">
						Vendor: {vendor?.login}
					</p>
					<p className="text-sm text-gray-500 mt-1">
						Amount: {item.quantity}
					</p>
				</div>

				{/* Cost and actions */}
				<div className="flex flex-col items-end space-y-4">
					<div className="text-right">
						<p className="text-lg font-bold text-gray-900">
							${item.good.price.toLocaleString()}
						</p>
						<p className="text-sm text-gray-500">
							${(item.good.price * item.quantity).toLocaleString()} total
						</p>
					</div>

					{/* Quantity controls */}
					<div className="flex items-center space-x-2">
						<button
							onClick={handleDecreaseQuantity}
							className="inline-flex items-center justify-center w-8 h-8 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
							</svg>
						</button>

						<span className="text-lg font-medium text-gray-900 min-w-[2rem] text-center">
							{item.quantity}
						</span>

						<button
							onClick={handleIncreaseQuantity}
							className="inline-flex items-center justify-center w-8 h-8 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
							</svg>
						</button>
					</div>

				</div>
			</div>
		</div>
	);
}
