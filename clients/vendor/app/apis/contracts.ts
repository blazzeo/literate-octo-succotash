import { ethers } from "ethers";
import VendorFabric from './VendorFabric.json';
import Vendor from './Vendor.json';
import Order from './Order.json';


export function uuidToBytes16(uuid) {
	const hexString = uuid.replace(/-/g, '');
	return '0x' + hexString;
}

export function bytes16ToUuid(bytes16) {
	const hex = bytes16.slice(2); // убираем '0x'
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// ===== VENDOR FABRIC CONTRACT =====
export function getVendorFabricContract(signerOrProvider: ethers.Signer | ethers.Provider, address: string) {
	return new ethers.Contract(address, VendorFabric.abi, signerOrProvider);
}

export async function createVendor(vendorId: string, signer: ethers.Signer, fabricAddress: string) {
	const fabric = getVendorFabricContract(signer, fabricAddress);

	// bytes32 из строки (как в Solidity)
	const vendorHash = ethers.id(vendorId);

	const tx = await fabric.addVendor(vendorHash);
	console.log("📦 createVendor TX sent:", tx.hash);

	const receipt = await tx.wait();
	console.log("✅ Vendor created:", receipt);
	return receipt;
}

export async function getVendorAddress(account: string, signer: ethers.Signer, fabricAddress: string): Promise<string> {
	const fabric = getVendorFabricContract(signer, fabricAddress);
	return await fabric.getVendorByOwner(account);
}

// ===== VENDOR CONTRACT =====
export function getVendorContract(signerOrProvider: ethers.Signer | ethers.Provider, address: string) {
	return new ethers.Contract(address, Vendor.abi, signerOrProvider);
}

export async function deactivateVendor(signer: ethers.Signer, vendorAddress: string) {
	const vendor = getVendorContract(signer, vendorAddress);

	const tx = await vendor.deactivate();
	console.log("🚫 deactivateVendor TX sent:", tx.hash);

	const receipt = await tx.wait();
	console.log("✅ Vendor deactivated:", receipt);
	return receipt;
}

export async function activateVendor(signer: ethers.Signer, vendorAddress: string) {
	const vendor = getVendorContract(signer, vendorAddress);

	const tx = await vendor.activate();
	console.log("🚫 activateVendor TX sent:", tx.hash);

	const receipt = await tx.wait();
	console.log("✅ Vendor activated:", receipt);
	return receipt;
}

export async function deactivateAndRefundBatch(
	signer: ethers.Signer,
	vendorAddress: string,
	startIndex: number,
	count: number
) {
	const vendor = getVendorContract(signer, vendorAddress);

	const tx = await vendor.deactivateAndRefundBatch(startIndex, count);
	console.log("🚫 deactivateAndRefundBatch TX sent:", tx.hash);

	const receipt = await tx.wait();
	console.log("✅ Vendor deactivated and refund batch processed:", receipt);
	return receipt;
}

export async function getOrdersCount(
	signer: ethers.Signer,
	vendorAddress: string
): Promise<number> {
	const vendor = getVendorContract(signer, vendorAddress);

	const count = await vendor.ordersCount();
	console.log("📊 Orders count:", count.toString());
	return Number(count);
}

export async function deactivateVendorWithFullRefund(
	signer: ethers.Signer,
	vendorAddress: string,
	batchSize: number = 50
) {
	const vendor = getVendorContract(signer, vendorAddress);

	const totalOrders = await getOrdersCount(signer, vendorAddress);
	console.log(`🔄 Processing ${totalOrders} orders in batches of ${batchSize}`);

	if (totalOrders === 0) {
		console.log("📭 No orders to refund, deactivating vendor only");
		const tx = await vendor.deactivate();
		const receipt = await tx.wait();
		console.log("✅ Vendor deactivated (no orders to refund):", receipt);
		return receipt;
	}

	for (let startIndex = 0; startIndex < totalOrders; startIndex += batchSize) {
		const currentBatchSize = Math.min(batchSize, totalOrders - startIndex);
		console.log(`🔄 Processing batch: startIndex=${startIndex}, count=${currentBatchSize}`);

		const tx = await vendor.deactivateAndRefundBatch(startIndex, currentBatchSize);
		console.log(`📦 Batch ${Math.floor(startIndex / batchSize) + 1} TX sent:`, tx.hash);

		const receipt = await tx.wait();
		console.log(`✅ Batch ${Math.floor(startIndex / batchSize) + 1} completed:`, receipt);
	}

	console.log("🎉 Vendor fully deactivated and all orders refunded");
}

export async function getVendorInfo(signer: ethers.Signer, vendorAddress: string) {
	const vendor = getVendorContract(signer, vendorAddress);

	const [vendorId, isActive, owner] = await Promise.all([
		vendor.vendorId(),
		vendor.isActive(),
		vendor.owner()
	]);

	return {
		vendorId: vendorId,
		isActive: isActive,
		owner: owner,
		address: vendorAddress
	};
}

export async function getOrderAddress(orderId: string, signer: ethers.Signer, vendorAddress: string): Promise<string> {
	const vendor = getVendorContract(signer, vendorAddress);
	const orderIdHash = ethers.id(orderId);
	return await vendor.orders(orderIdHash);
}

// ===== ORDER CONTRACT =====
export function getOrderContract(signerOrProvider: ethers.Signer | ethers.Provider, address: string) {
	return new ethers.Contract(address, Order.abi, signerOrProvider);
}

export async function getOrderInfo(signer: ethers.Signer, orderAddress: string) {
	const order = getOrderContract(signer, orderAddress);

	const [customer, vendorOwner, vendorContract, orderId, customerId, vendorId, totalAmount, status] = await Promise.all([
		order.customer(),
		order.vendorOwner(),
		order.vendorContract(),
		order.orderId(),
		order.customerId(),
		order.vendorId(),
		order.totalAmount(),
		order.status()
	]);

	return {
		customer,
		vendorOwner,
		vendorContract,
		orderId,
		customerId,
		vendorId,
		totalAmount: ethers.formatEther(totalAmount),
		status: Number(status)
	};
}

export async function approveOrder(signer: ethers.Signer, orderAddress: string) {
	const order = getOrderContract(signer, orderAddress);

	const tx = await order.approve();
	console.log("✅ approveOrder TX sent:", tx.hash);

	const receipt = await tx.wait();
	console.log("✅ Order approved:", receipt);
	return receipt;
}

export async function cancelOrder(signer: ethers.Signer, orderAddress: string) {
	const order = getOrderContract(signer, orderAddress);

	const tx = await order.cancel();
	console.log("❌ cancelOrder TX sent:", tx.hash);

	const receipt = await tx.wait();
	console.log("✅ Order canceled:", receipt);
	return receipt;
}

export async function sellOrder(signer: ethers.Signer, orderAddress: string) {
	const order = getOrderContract(signer, orderAddress);

	const tx = await order.sell();
	console.log("💰 sellOrder TX sent:", tx.hash);

	const receipt = await tx.wait();
	console.log("✅ Order sold:", receipt);
	return receipt;
}

// ===== UTILITY FUNCTIONS =====
export function formatOrderStatus(status: number): string {
	const statusMap: { [key: number]: string } = {
		0: "Created",
		1: "Approved",
		2: "Paid",
		3: "Sold",
		4: "Canceled"
	};
	return statusMap[status] || "Unknown";
}

export function isOrderActive(status: number): boolean {
	return status < 4; // Not canceled
}

export function canApproveOrder(status: number): boolean {
	return status === 0; // Only created orders can be approved
}

export function canCancelOrder(status: number): boolean {
	return status < 3; // Can cancel if not sold
}

export function canSellOrder(status: number): boolean {
	return status === 2; // Only paid orders can be sold
}
