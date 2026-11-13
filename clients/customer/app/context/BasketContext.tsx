import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import axios from "axios";
import { BasketGoodCompact, BasketInfo } from "./types";
import { GOODS_SERVICE_URI } from "../apis/goods_api";

interface BasketContextType {
	cartCount: number;
	goods: BasketGoodCompact[];
	loading: boolean;
	refreshBasket: () => Promise<void>;
}

const BasketContext = createContext<BasketContextType | undefined>(undefined);

export const BasketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [basketInfo, setBasket] = useState<BasketInfo | null>(null)
	const [loading, setLoading] = useState<boolean>(true)

	const fetchBasket = async () => {
		setLoading(true);
		try {
			const res = await axios.get(`${GOODS_SERVICE_URI}/basket/info`, { withCredentials: true });
			let basket = res.data as BasketInfo

			setBasket(basket as BasketInfo);
		} catch (err) {
			console.error("Failed to fetch basket", err);
			setBasket(null);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchBasket();
	}, []);

	return (
		<BasketContext.Provider value={
			{
				cartCount: basketInfo?.amount ?? 0,
				goods: basketInfo?.goods ?? [],
				loading, refreshBasket: fetchBasket
			}
		}>
			{children}
		</BasketContext.Provider >
	);
};

export const useBasketInfo = (): BasketContextType => {
	const context = useContext(BasketContext);
	if (!context) {
		throw new Error("useBasketInfo must be used within a BasketInfoProvider");
	}
	return context;
};
