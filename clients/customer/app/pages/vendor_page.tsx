import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Layout from "../components/Layout/Layout";
import { BLOB_SERVICE_URI } from "../apis/blob_api";
import { getVendorInfo } from "../apis/vendors_api";
import { VendorInfo } from "../context/types";
import { toast } from "react-toastify";
import GoodsWrapper from "../components/goods/goodsWrapper";

export default function VendorPage() {
	const location = useLocation()
	const queryParams = new URLSearchParams(location.search)

	const [vendor, setVendor] = useState<VendorInfo>()

	const vendor_id = queryParams.get('id')

	useEffect(() => {
		const fetchData = async () => {
			try {
				await fetchVendor(vendor_id!);
			} catch (error) {
				console.error(error);
				toast.error("Failed fetching data");
			}
		};

		fetchData();
	}, [])

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
		<Layout>
			<div className="flex flex-col items-center justify-center">
				<img
					src={`${BLOB_SERVICE_URI}/file/avatars/${vendor_id}.jpg`}
					alt={vendor?.login}
					className="w-40 h-40 rounded-full object-cover border"
					onError={(e) => {
						(e.currentTarget as HTMLImageElement).src = "/default-picture.jpg";
					}}
				/>
				<h2 className="mt-5 text-3xl font-bold">{vendor?.login}</h2>
			</div>
			<GoodsWrapper vendor_id={vendor_id} />
		</Layout>
	)
}
