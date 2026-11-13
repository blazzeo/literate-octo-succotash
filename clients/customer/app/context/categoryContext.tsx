import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import axios from "axios";
import { Category } from "./types";
import { GOODS_SERVICE_URI } from "../apis/goods_api";

interface CategoriesContextType {
	categories: Category[];
	loading: boolean;
	refreshCategories: () => void;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

export const CategoriesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	const fetchCategories = async () => {
		setLoading(true);
		try {
			const res = await axios.get<Category[]>(`${GOODS_SERVICE_URI}/categories/`);
			setCategories(res.data);
		} catch (err) {
			console.error("Failed to fetch categories", err);
			setCategories([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchCategories();
	}, []);

	return (
		<CategoriesContext.Provider value={{ categories, loading, refreshCategories: fetchCategories }}>
			{children}
		</CategoriesContext.Provider>
	);
};

export const useCategories = (): CategoriesContextType => {
	const context = useContext(CategoriesContext);
	if (!context) {
		throw new Error("useCategories must be used within a CategoriesProvider");
	}
	return context;
};
