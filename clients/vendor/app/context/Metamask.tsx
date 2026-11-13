import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ethers } from 'ethers';
import { getVendorFabricContract, getVendorContract, getOrderContract, activateVendor, uuidToBytes16, deactivateVendorWithFullRefund } from '../apis/contracts';
import { getOrders, OrderStatus } from '../apis/orders_api';
import axios from 'axios';
import { updateProfile, getVendorInfo } from '../apis/vendor_api';

const BLOCKCHAIN_SERVICE_URI = import.meta.env.VITE_BLOCKCHAIN_SERVICE_URI;

declare global {
	interface Window {
		ethereum?: any;
	}
}

interface AddressResponse {
	address: string
}

export interface VendorInfoContract {
	vendorId: string;
	address: string;
	isActive: boolean;
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
	isActive: boolean | undefined;
	account: string | null;
	chainId: number | null;

	// Vendor specific
	vendorInfo: VendorInfoContract | null;
	vendorContract: ethers.Contract | null;
	vendorFabricContract: ethers.Contract | null;

	// Orders
	orders: OrderInfo[];

	// Functions
	connect: () => Promise<void>;
	createVendor: (fabricAddess: string, vendorId: string) => Promise<string>;
	approveOrder: (orderAddress: string) => Promise<void>;
	cancelOrder: (orderAddress: string) => Promise<void>;
	sellOrder: (orderAddress: string) => Promise<void>;
	// fetchVendorInfo: (vendorContractInstance?: ethers.Contract) => Promise<VendorInfoContract>,
	refreshVendorInfo: () => Promise<void>;
	deactivateAccount: () => Promise<void>;
	activateAccount: () => Promise<void>;
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
	const [isActive, setIsActive] = useState<boolean | undefined>(undefined);
	const [account, setAccount] = useState<string | null>(null);
	const [chainId, setChainId] = useState<number | null>(null);
	const [vendorInfo, setVendorInfo] = useState<VendorInfoContract | null>(null);
	const [vendorContract, setVendorContract] = useState<ethers.Contract | null>(null);
	const [vendorFabricContract, setVendorFabricContract] = useState<ethers.Contract | null>(null);
	const [orders, setOrders] = useState<OrderInfo[]>([]);
	const [vendorFabricAddress, setVendorFabricAddress] = useState<string>();
	const [vendorAddress, setVendorAddress] = useState<string>();

	const getSigner = async (): Promise<ethers.JsonRpcSigner> => {
		const provider = new ethers.BrowserProvider(window.ethereum);
		return await provider.getSigner();
	};

	const getVendorFabricAddress = async (): Promise<string | null> => {
		try {
			const res = await axios.get<AddressResponse>(`${BLOCKCHAIN_SERVICE_URI}/api/address`);
			if (!res.data || !res.data.address) {
				throw new Error("Invalid response: 'address' missing");
			}

			const signer = await getSigner();
			const address = res.data.address;
			const fabricContract = getVendorFabricContract(signer, address);

			setVendorFabricAddress(address);
			setVendorFabricContract(fabricContract);
			return address;
		} catch (err) {
			console.error('Failed to get contract address:', err);
			setVendorFabricContract(null);
			return null;
		}
	};

	const initContracts = async (fabricAddress?: string, accountArg?: string) => {
		try {
			const effectiveAddress = fabricAddress || vendorFabricAddress;
			const effectiveAccount = accountArg || account;
			if (!effectiveAccount) return console.error('No account for contract init');
			if (!effectiveAddress) return console.error('No vendorFabricAddress for contract init');

			const vendor_id = localStorage.getItem('user_id')
			const vendor_api_info = await getVendorInfo(vendor_id!);

			const signer = await getSigner();
			const fabricContract = getVendorFabricContract(signer, effectiveAddress);
			setVendorFabricContract(fabricContract);

			try {
				const vendorAddress = await fabricContract.getVendorByOwner(effectiveAccount);
				console.log('vendor address:', vendorAddress);

				if (vendorAddress && vendorAddress !== ethers.ZeroAddress) {
					setVendorAddress(vendorAddress);
					const vendorContractInstance = getVendorContract(signer, vendorAddress);
					setVendorContract(vendorContractInstance);
					const active = await vendorContractInstance.isActive()

					console.log(vendor_api_info)

					if (vendor_api_info.billing_address != vendorAddress) {
						vendor_api_info.billing_address = vendorAddress
						await updateProfile(vendor_api_info)
					}

					setIsActive(active)
					await refreshVendorInfo(vendorContractInstance);
				}
			} catch {
				const vendorId = localStorage.getItem('user_id');
				if (!vendorId)
					throw new Error('Unauthorized');

				console.log('No vendor found, creating vendor...');
				const vendorAddress = await createVendor(effectiveAddress, vendorId);
				console.log('Vendor created:', vendorAddress);

				//	update vendor's info on vendor_api
				if (vendor_api_info.billing_address != vendorAddress) {
					vendor_api_info.billing_address = vendorAddress
					await updateProfile(vendor_api_info)
					console.log('updated vendorInfo', vendor_api_info)
				}
			}
		} catch (err) {
			console.error('Error initializing contracts:', err);
		}
	};

	const deactivateAccount = async () => {
		if (!account) throw new Error('Not connected');
		try {
			const signer = await getSigner();
			deactivateVendorWithFullRefund(signer, vendorAddress!);
			await refreshVendorInfo(vendorContract!);
		} catch (err) {
			console.error('Error approving order:', err);
			throw err;
		}
	}

	const activateAccount = async () => {
		if (!account) throw new Error('Not connected');
		try {
			const signer = await getSigner();
			activateVendor(signer, vendorAddress!);
			await refreshVendorInfo(vendorContract!);
		} catch (err) {
			console.error('Error approving order:', err);
			throw err;
		}
	}

	const connect = async () => {
		if (typeof window.ethereum === 'undefined') throw new Error('MetaMask not installed');

		try {
			const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
			const chainId = await window.ethereum.request({ method: 'eth_chainId' });
			const currentAccount = accounts[0];

			setAccount(currentAccount);
			setChainId(parseInt(chainId, 16));
			setIsConnected(true);

			const address = await getVendorFabricAddress();
			if (!address) throw new Error('Connection to blockchain failed');

			console.log(address)

			await initContracts(address, currentAccount);
		} catch (err) {
			console.error('Error connecting to MetaMask:', err);
			throw err;
		}
	};

	const createVendor = async (fabricAddress: string, vendorId: string): Promise<string> => {
		try {
			const signer = await getSigner();
			const fabricContract = getVendorFabricContract(signer, fabricAddress);
			if (!fabricContract) throw new Error('VendorFabric contract not initialized');

			const bytesVendorId = uuidToBytes16(vendorId);
			const tx = await fabricContract.addVendor(bytesVendorId);
			await tx.wait();

			const vendorAddress = await fabricContract.getVendorByOwner(await signer.getAddress());
			const vendorContractInstance = getVendorContract(signer, vendorAddress);
			setVendorContract(vendorContractInstance);
			await refreshVendorInfo(vendorContractInstance);

			return vendorAddress;
		} catch (err) {
			console.error('Error creating vendor:', err);
			throw err;
		}
	};

	const approveOrder = async (orderAddress: string) => {
		if (!account) throw new Error('Not connected');

		try {
			const signer = await getSigner();
			const orderContract = getOrderContract(signer, orderAddress);

			const tx = await orderContract.approve();
			await tx.wait();
			await refreshOrders(null);
		} catch (err) {
			console.error('Error approving order:', err);
			throw err;
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
		} catch (err) {
			console.error('Error cancelling order:', err);
			throw err;
		}
	};

	const sellOrder = async (orderAddress: string) => {
		if (!account) throw new Error('Not connected');
		try {
			const signer = await getSigner();
			const orderContract = getOrderContract(signer, orderAddress);

			const tx = await orderContract.sell();
			await tx.wait();
			await refreshOrders(null);
		} catch (err) {
			console.error('Error selling order:', err);
			throw err;
		}
	};

	const refreshVendorInfo = async (contractInstance?: ethers.Contract) => {
		const contract = contractInstance || vendorContract;
		if (!contract) return;

		try {
			const [vendorId, localIsActive] = await Promise.all([
				contract.vendorId(),
				contract.isActive()
			]);

			setVendorInfo({
				vendorId,
				address: await contract.getAddress(),
				isActive: localIsActive
			});

			setIsActive(localIsActive)
		} catch (err) {
			console.error('Error refreshing vendor info:', err);
		}
	};

	const refreshOrders = async (status: OrderStatus | null) => {
		const user_id = localStorage.getItem('user_id');
		if (!user_id) return;
		try {
			const fetchedOrders = await getOrders(user_id, status);
			setOrders(fetchedOrders);
		} catch (err) {
			console.error('Error refreshing orders:', err);
		}
	};

	useEffect(() => {
		checkConnection();

		async function checkConnection() {
			if (typeof window.ethereum === 'undefined') return;
			try {
				const accounts = await window.ethereum.request({ method: 'eth_accounts' });
				const chainId = await window.ethereum.request({ method: 'eth_chainId' });
				if (accounts.length > 0) {
					const currentAccount = accounts[0];
					setAccount(currentAccount);
					setChainId(parseInt(chainId, 16));
					setIsConnected(true);

					const address = vendorFabricAddress || (await getVendorFabricAddress());
					if (address) await initContracts(address, currentAccount);
				}
			} catch (err) {
				console.error('Error checking connection:', err);
			}
		}

		const handleAccountsChanged = async (accounts: string[]) => {
			if (accounts.length === 0) {
				setAccount(null);
				setIsConnected(false);
				setVendorContract(null);
				setVendorAddress(undefined);
			} else {
				const address = vendorFabricAddress || (await getVendorFabricAddress());
				if (address) await initContracts(address, accounts[0]);
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
		isActive,
		account,
		chainId,
		vendorInfo,
		vendorContract,
		vendorFabricContract,
		orders,
		connect,
		createVendor,
		approveOrder,
		cancelOrder,
		sellOrder,
		deactivateAccount,
		refreshVendorInfo,
		activateAccount,
		refreshOrders
	};

	return (
		<MetaMaskContext.Provider value={value}>
			{children}
		</MetaMaskContext.Provider>
	);
}
