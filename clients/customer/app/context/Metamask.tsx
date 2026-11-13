import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ethers } from 'ethers';
import { getVendorFabricContract, getVendorContract, getOrderContract, uuidToBytes16 } from '../apis/contracts';
import { getOrders, OrderStatus } from '../apis/orders_api';
import axios from 'axios';
import { getVendorInfo } from '../apis/vendors_api';

const BLOCKCHAIN_SERVICE_URI = import.meta.env.VITE_BLOCKCHAIN_SERVICE_URI;

declare global {
	interface Window {
		ethereum?: any;
	}
}

interface AddressResponse {
	address: string
}

interface OrderInfo {
	orderId: string;
	customerId: string;
	vendorId: string;
	totalAmount: string;
	status: number;
}

interface MetaMaskContextType {
	// Connection
	isConnected: boolean;
	account: string | null;
	chainId: number | null;

	// Vendor specific
	vendorFabricContract: ethers.Contract | null;

	// Orders
	orders: OrderInfo[];

	// Functions
	connect: () => Promise<void>;
	disconnect: () => void;
	getSigner: () => Promise<ethers.JsonRpcSigner>;
	markOrderDelivered: (orderAddress: string) => Promise<void>;
	createOrder: (vendorId: string, customerId: string, orderId: string, totalAmount: string) => Promise<void>;
	cancelOrder: (orderAddress: string) => Promise<void>;
	depositToOrder: (orderAddress: string, amount: string) => Promise<void>;
	refreshOrders: (status: OrderStatus | null) => Promise<void>;
}

const MetaMaskContext = createContext<MetaMaskContextType | undefined>(undefined);

export function useMetaMask() {
	const context = useContext(MetaMaskContext);
	if (context === undefined) {
		throw new Error('useMetaMask must be used within a MetaMaskProvider');
	}
	return context;
}

interface MetaMaskProviderProps {
	children: ReactNode;
}


export function MetaMaskProvider({ children }: MetaMaskProviderProps) {
	const [isConnected, setIsConnected] = useState(false);
	const [account, setAccount] = useState<string | null>(null);
	const [chainId, setChainId] = useState<number | null>(null);
	const [vendorFabricContract, setVendorFabricContract] = useState<ethers.Contract | null>(null);
	const [orders, setOrders] = useState<OrderInfo[]>([]);
	const [vendorFabricAddress, setVendorFabricAddress] = useState<string>();

	const getSigner = async (): Promise<ethers.JsonRpcSigner> => {
		const provider = new ethers.BrowserProvider(window.ethereum);
		return provider.getSigner();
	};

	const checkConnection = async () => {
		if (typeof window.ethereum !== 'undefined') {
			try {
				const accounts = await window.ethereum.request({ method: 'eth_accounts' });
				const chainId = await window.ethereum.request({ method: 'eth_chainId' });

				if (accounts.length > 0) {
					setAccount(accounts[0]);
					setChainId(parseInt(chainId, 16));
					setIsConnected(true);
					await initContracts();
				}
			} catch (error) {
				console.error('Error checking connection:', error);
			}
		}
	};

	const getVendorFabricAddress = async () => {
		try {
			const res = await axios.get<AddressResponse>(`${BLOCKCHAIN_SERVICE_URI}/api/address`);
			if (!res.data?.address) throw new Error("Invalid response: 'address' missing");

			setVendorFabricAddress(res.data.address);

			const signer = await getSigner();
			const contract = getVendorFabricContract(signer, res.data.address);
			setVendorFabricContract(contract);
		} catch (err) {
			console.error("Failed to get contract address:", err);
			setVendorFabricContract(null);
		}
	};

	const getVendorAddress = async (vendorId: string) => {
		try {
			const vendor_info = await getVendorInfo(vendorId)
			return vendor_info.billing_address
		} catch (error) {
			console.error(error);
		}
	};

	const initContracts = async () => {
		if (!vendorFabricAddress) return;

		try {
			const signer = await getSigner();
			const fabricContract = getVendorFabricContract(signer, vendorFabricAddress);
			setVendorFabricContract(fabricContract);
		} catch (error) {
			console.error('Error initializing contracts: ', error);
		}
	};

	const connect = async () => {
		if (typeof window.ethereum === 'undefined')
			throw new Error('MetaMask is not installed');

		try {
			const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
			const chainId = await window.ethereum.request({ method: 'eth_chainId' });

			setAccount(accounts[0]);
			setChainId(parseInt(chainId, 16));
			setIsConnected(true);

			await getVendorFabricAddress();
			await initContracts();
		} catch (error) {
			console.error('Error connecting to MetaMask:', error);
			throw error;
		}
	};

	const disconnect = () => {
		setIsConnected(false);
		setAccount(null);
		setChainId(null);
		setVendorFabricContract(null);
		setOrders([]);
	};

	const createOrder = async (vendorId: string, customerId: string, orderId: string, totalAmount: string) => {
		try {
			const vendorAddress = await getVendorAddress(vendorId);
			if (!vendorAddress)
				throw new Error('No billing address was found')

			const signer = await getSigner();
			const vendorContract = getVendorContract(signer, vendorAddress);

			const customer16bytes = uuidToBytes16(customerId);
			const order16bytes = uuidToBytes16(orderId);

			const tx = await vendorContract.createOrder(
				customer16bytes,
				order16bytes,
				ethers.parseEther(totalAmount.toString())
			);
			await tx.wait();
			await refreshOrders(null);
		} catch (error) {
			console.error('Error creating order:', error);
			throw error;
		}
	};

	const cancelOrder = async (orderAddress: string) => {
		if (!account) throw new Error('Not connected');

		try {
			const signer = await getSigner();
			const orderContract = getOrderContract(signer, orderAddress);
			const tx = await orderContract.cancel();
			await tx.wait();
			await refreshOrders(null);
		} catch (error) {
			console.error('Error canceling order:', error);
			throw error;
		}
	};

	const depositToOrder = async (orderAddress: string, amount: string) => {
		if (!account) throw new Error('Not connected');

		try {
			const signer = await getSigner();
			const orderContract = getOrderContract(signer, orderAddress);
			const tx = await orderContract.deposit({ value: ethers.parseEther(amount) });
			await tx.wait();
			await refreshOrders(null);
		} catch (error) {
			console.error('Error depositing to order:', error);
			throw error;
		}
	};

	const markOrderDelivered = async (orderAddress: string) => {
		if (!account) throw new Error('Not connected');

		try {
			const signer = await getSigner();
			const orderContract = getOrderContract(signer, orderAddress);
			const tx = await orderContract.delivered();
			await tx.wait();
			await refreshOrders(null);
		} catch (error) {
			console.error('Error marking order delivered:', error);
			throw error;
		}
	};

	const refreshOrders = async (status: OrderStatus | null) => {
		const user_id = localStorage.getItem('user_id');
		if (!user_id) {
			console.log('Refreshing orders failed');
			return;
		}
		getOrders(user_id, status);
	};


	useEffect(() => {
		checkConnection();

		const handleAccountsChanged = async (accounts: string[]) => {
			if (accounts.length === 0) {
				disconnect();
			} else {
				setAccount(accounts[0]);
				await initContracts();
			}
		};

		const handleChainChanged = () => window.location.reload();

		if (window.ethereum) {
			window.ethereum.on('accountsChanged', handleAccountsChanged);
			window.ethereum.on('chainChanged', handleChainChanged);
		}

		return () => {
			if (window.ethereum) {
				window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
				window.ethereum.removeListener('chainChanged', handleChainChanged);
			}
		};
	}, []);

	const value: MetaMaskContextType = {
		isConnected,
		account,
		chainId,
		vendorFabricContract,
		orders,
		connect,
		getSigner,
		disconnect,
		createOrder,
		cancelOrder,
		depositToOrder,
		markOrderDelivered,
		refreshOrders
	};

	return (
		<MetaMaskContext.Provider value={value}>
			{children}
		</MetaMaskContext.Provider>
	);
}
