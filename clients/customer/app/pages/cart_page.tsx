import React, { useEffect, useState } from "react"
import Layout from '../components/Layout/Layout'
import { BasketGood } from "../context/types"
import { useBasketInfo } from "../context/BasketContext"
import { fetch_basket } from "../apis/goods_api"
import CartItem from "../components/cart/CartItem"
import { ShoppingBag } from "lucide-react"
import { useMetaMask } from "../context/Metamask"
import { createOrder as createApiOrder } from "../apis/orders_api"
import { toast } from "react-toastify"
import { fetchProfile } from "../apis/customers_api"
import { Link } from "react-router-dom"

export default function CartPage() {
	const { cartCount, refreshBasket } = useBasketInfo()
	const [cartItems, setCartItems] = useState<BasketGood[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [selectedShippingAddress, setSelectedShippingAddress] = useState<string | null>(null)
	const [shippingAddresses, setShippingAddresses] = useState<string[] | null>(null)

	const [selectedItems, setSelectedItems] = useState<BasketGood[]>([]);
	const { account, createOrder, getSigner } = useMetaMask();

	const handleToggleSelect = (good: BasketGood) => {
		setSelectedItems((prev) =>
			prev.some((g) => g.good._id === good.good._id)
				? prev.filter((prevGood) => prevGood.good._id !== good.good._id)
				: [...prev, good]
		);
	};

	const fetchCart = async () => {
		try {
			setLoading(true)
			setError(null)
			const fetchedCart = await fetch_basket(0, 30)
			setCartItems(fetchedCart)

			let user_id = localStorage.getItem('user_id')
			if (!user_id)
				throw new Error('Unauthorized')

			const userInfo = await fetchProfile(user_id)
			setShippingAddresses(userInfo.shipment_addresses)
		} catch (err) {
			console.error('Error fetching cart:', err)
			setError('Failed to get your cart')
		} finally {
			setLoading(false)
		}
	}

	const handleRemoveItem = (goodId: string) => {
		setCartItems(prev => prev.filter(item => item.good._id !== goodId))
		refreshBasket()
	}

	const handleUpdateQuantity = (goodId: string, newQuantity: number) => {
		setCartItems(prev =>
			prev.map(item =>
				item.good._id === goodId
					? { ...item, quantity: newQuantity }
					: item
			)
		)
		refreshBasket()
	}

	const handleMakingOrder = async () => {
		try {
			if (!account) {
				toast.error("MetaMask not connected");
				return;
			}

			const customerId = localStorage.getItem('user_id');

			if (customerId == undefined || customerId == null)
				throw 'Unauthorized'


			// 1️⃣ group goods by vendor_id
			const groupedByVendor = selectedItems.reduce((acc, item) => {
				const vendorId = item.good.vendor_id;
				if (!acc[vendorId]) {
					acc[vendorId] = [];
				}
				acc[vendorId].push(item);
				return acc;
			}, {} as Record<string, BasketGood[]>);

			for (const [vendorId, items] of Object.entries(groupedByVendor)) {
				// 3️⃣ count total sum
				const total = items.reduce(
					(sum, i) => sum + i.good.price * i.quantity,
					0
				);

				if (selectedShippingAddress == null)
					throw new Error("No Shipping address was selected")
				const orderId = await createApiOrder(vendorId, "", selectedShippingAddress, items);

				console.log(`Vendor: ${vendorId}, Total: ${total}`, items);

				await createOrder(vendorId, customerId, orderId, total.toString());
			}
		} catch (error: any) {
			console.error(error);
			toast.error("Failed to create order");
		}
	};

	useEffect(() => {
		fetchCart()
	}, [])

	const totalPrice = cartItems.reduce((sum, item) => sum + (item.good.price * item.quantity), 0)
	const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
	const selectedPrice = selectedItems.reduce((sum, item) => sum + (item.good.price * item.quantity), 0)
	const selectedItemsCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0)

	if (loading) {
		return (
			<Layout>
				<div className="min-h-screen py-8">
					<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="flex items-center justify-center h-64">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
						</div>
					</div>
				</div>
			</Layout>
		)
	}

	if (error) {
		return (
			<Layout>
				<div className="min-h-screen py-8">
					<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
							<div className="text-red-600 text-lg font-medium mb-2">Error :(</div>
							<p className="text-red-500">{error}</p>
							<button
								onClick={fetchCart}
								className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
							>
								Try again
							</button>
						</div>
					</div>
				</div>
			</Layout>
		)
	}

	return (
		<Layout>
			<div className="min-h-screen py-8">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
					{/* Header */}
					<div className="mb-8">
						<h1 className="text-3xl font-bold text-gray-900">Cart</h1>
						<p className="mt-2 text-gray-600">
							Goods in cart: {totalItems} on total of ${totalPrice.toLocaleString()}
						</p>
					</div>

					{cartItems.length === 0 ? (
						/* Empty cart */
						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
							<div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
								<ShoppingBag size={50} />
							</div>
							<h3 className="text-xl font-semibold text-gray-900 mb-2">Cart is empty 🥲</h3>
							<p className="text-gray-600 mb-6">Add goods, so they will appear here</p>
							<a
								href="/"
								className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
							>
								<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
								</svg>
								Back to catalog
							</a>
						</div>
					) : (
						/* List of goods */
						<div className="space-y-3">
							{cartItems.map((item) => (
								<div
									key={item.good._id}
									className="flex items-center justify-between"
								>
									{/* checkbox */}
									<input
										type="checkbox"
										checked={selectedItems.some((g) => g.good._id === item.good._id)}
										onChange={() => handleToggleSelect(item)}
										className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300 mr-4"
									/>

									{/* CartItem */}
									<div className="flex-1">
										<CartItem
											item={item}
											onRemove={handleRemoveItem}
											onUpdateQuantity={handleUpdateQuantity}
										/>
									</div>
								</div>
							))}

							{/* General info */}
							<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
								<div className="flex justify-between items-center">
									<div>
										<h3 className="text-lg font-semibold text-gray-900">Total</h3>
										<p className="text-sm text-gray-600">
											{selectedItemsCount} goods
										</p>
									</div>
									<div className="text-right">
										<p className="text-2xl font-bold text-gray-900">
											${selectedPrice.toLocaleString()}
										</p>
									</div>
								</div>

								{/* Shipping Address Select */}
								<div className="mt-4">
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Shipping Address
									</label>
									{shippingAddresses?.length == 0 || shippingAddresses == null ?
										<p>Please add shipping address on <Link to={"/profile"} className="underline text-blue-500 hover:text-blue-700">Profile Page</Link></p>
										:
										<>
											<select
												value={selectedShippingAddress || ''}
												onChange={(e) => setSelectedShippingAddress(e.target.value)}
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
											>
												<option value="">Select shipping address</option>
												{shippingAddresses.map((address, index) => (
													<option key={index} value={address}>
														{address}
													</option>
												))}
											</select>
											{!selectedShippingAddress && (
												<p className="text-sm text-red-600 mt-1">Please select a shipping address</p>
											)}
										</>
									}
								</div>

								<div className="mt-6 flex space-x-4">
									<button
										className="flex-1 disabled:bg-gray-400 disabled:cursor-not-allowed bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
										onClick={() => handleMakingOrder()}
										disabled={selectedItemsCount === 0 || !selectedShippingAddress}
									>
										Make an order
									</button>
									<a
										href="/"
										className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors text-center"
									>
										Continue shopping
									</a>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</Layout >
	)
}
