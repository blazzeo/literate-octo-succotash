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
export function getVendorFabricContract(
	signerOrProvider: ethers.Signer | ethers.Provider,
	address: string
) {
	return new ethers.Contract(address, VendorFabric.abi, signerOrProvider);
}

async function findVendorAddress(
	signer: ethers.Signer | ethers.Provider,
	fabric_address: string,
	vendorId: string,
) {
	const vendor_fabric = getVendorFabricContract(signer, fabric_address);

	const vendor_id_bytes32 = ethers.id(vendorId);
	const vendor_address = await vendor_fabric.getVendor(vendor_id_bytes32);

	return vendor_address;
}

// ===== VENDOR CONTRACT =====
export function getVendorContract(
	signerOrProvider: ethers.Signer | ethers.Provider,
	address: string
) {
	return new ethers.Contract(address, Vendor.abi, signerOrProvider);
}

export async function makeOrder(
	signer: ethers.Signer | ethers.Provider,
	vendor_contract_address: string,
	customerId: string,
	orderId: string,
	cartValue: number,
) {
	const vendor_contract = getVendorContract(signer, vendor_contract_address);

	const customer_id_bytes32 = ethers.id(customerId);
	const order_id_bytes32 = ethers.id(orderId);

	const res = await vendor_contract.createOrder(
		customer_id_bytes32,
		order_id_bytes32,
		cartValue
	)
}

// ===== ORDER CONTRACT =====
export function getOrderContract(
	signerOrProvider: ethers.Signer | ethers.Provider,
	address: string
) {
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

export async function depositToOrder(orderAddress: string, amountEth: string, signer: ethers.Signer) {
	const order = getOrderContract(signer, orderAddress);
	const value = ethers.parseEther(amountEth);

	const tx = await order.deposit({ value });
	console.log("💰 Deposit TX:", tx.hash);

	const receipt = await tx.wait();
	console.log("✅ Deposit confirmed:", receipt);
	return receipt;
}

export async function cancelOrder(signer: ethers.Signer, orderAddress: string) {
	const order = getOrderContract(signer, orderAddress);

	const tx = await order.cancel();
	console.log("❌ Cancel order TX sent:", tx.hash);

	const receipt = await tx.wait();
	console.log("✅ Order canceled:", receipt);
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

export function canCancelOrder(status: number): boolean {
	return status < 3; // Can cancel if not sold
}
