import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Layout from '../components/Layout/Layout'
import { GoodType, VendorInfo } from "../context/types";
import ImageViewer from "../components/ImageViewer"
import { useCategories } from "../context/categoryContext"
import { GOODS_SERVICE_URI } from '../apis/goods_api'
import { BLOB_SERVICE_URI, fetch_good_blob_manifest } from '../apis/blob_api'
import { TagIcon } from "lucide-react";
import { getVendorInfo } from "../apis/vendors_api";

export default function GoodPage() {
	const location = useLocation()
	const queryParams = new URLSearchParams(location.search)

	const good_id = queryParams.get('id')

	const { categories } = useCategories()

	const [photoSrcs, setPhotoSrcs] = useState<string[]>([])
	const [good, setGood] = useState<GoodType>()
	const [vendor, setVendor] = useState<VendorInfo>()

	useEffect(() => {
		const fetchData = async () => {
			try {
				let fetchedGood = await fetchGood();
				await fetchPhotos(fetchedGood.vendor_id);
				await fetchVendor(fetchedGood.vendor_id);
			} catch (error) {
				console.error(error);
				toast.error("Failed fetching data");
			}
		};

		fetchData();
	}, [])

	const fetchGood = async (): Promise<GoodType> => {
		try {
			let res = await axios.get(`${GOODS_SERVICE_URI}/goods/${good_id}`)
			const fetchedGood = res.data as GoodType

			setGood(fetchedGood)

			return fetchedGood
		} catch (error) {
			console.error(error)
			toast.error(error)
			throw error
		}
	}

	const fetchPhotos = async (vendor_id: string) => {
		try {
			let manifest = await fetch_good_blob_manifest(vendor_id, good_id!)

			const absolutePaths = manifest.images.map((image) =>
				`${BLOB_SERVICE_URI}/file/goods/${vendor_id}/${good_id}/${image.file}`
			);

			setPhotoSrcs(absolutePaths)
		} catch (error) {
			console.error(error)
			toast.error(error)
		}
	}

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
			<div className="w-full px-4 sm:px-6 lg:px-10">
				<div className="flex flex-col md:flex-row gap-8">
					<div className="flex-1">
						<ImageViewer images={photoSrcs} />
					</div>

					<div className="flex-1">
						<h1 className="text-2xl sm:text-4xl md:text-6xl font-bold mb-4">
							{good?.title}
						</h1>

						<div className="flex items-center space-x-1 text-lg sm:text-xl mb-6">
							{[...Array(5)].map((_, i) => {
								const fill = Math.min(Math.max((good?.rating || 0) - i, 0), 1);
								return (
									<span
										key={i}
										className="relative flex items-center justify-center w-5 h-5"
									>
										<span className="absolute text-gray-300">★</span>
										<span
											className="absolute top-0 left-0 text-yellow-400 overflow-hidden"
											style={{ width: `${fill * 100}%` }}
										>
											★
										</span>
									</span>
								);
							})}
							<span className="ml-2">{good?.rating}</span>
						</div>

						<h3 className="text-base sm:text-xl md:text-2xl mb-6">
							{good?.description}
						</h3>

						<div className="flex flex-wrap gap-2 items-center mb-6">
							{categories
								.filter(c => good?.category_ids.includes(c._id))
								.map(c => (
									<span
										key={c._id}
										title={c.label}
										className={`inline-flex items-center gap-2 px-3 py-1 rounded-2xl text-sm font-medium shadow-sm transition-transform duration-150
                hover:scale-[1.03] active:scale-[0.98] select-none bg-gray-50 text-gray-700 ring-1 ring-gray-200`}
										aria-label={`Category: ${c.label}`}
									>
										<TagIcon className="w-4 h-4" />
										<span>{c.label}</span>
									</span>
								))}
						</div>
						<div>
							<p className="text-bae sm:text-xl md:text-2xl mb-6">
								Price:
								<span className="font-bold"> {good?.price} </span>
							</p>
						</div>


						<div className="flex items-center space-x-2">
							<p className="text-gray-700 text-xl font-medium">Vendor:</p>
							<img
								src={`${BLOB_SERVICE_URI}/file/avatars/${good?.vendor_id}.jpg`}
								alt={vendor?.login}
								className="w-8 h-8 rounded-full object-cover border"
								onError={(e) => {
									(e.currentTarget as HTMLImageElement).src = "/default-picture.jpg";
								}}
							/>
							<Link
								to={`/vendor?id=${vendor?.id}`}
								className="text-blue-600 text-xl hover:underline font-medium"
							>
								{vendor?.login}
							</Link>
						</div>
					</div>
				</div>
			</div>
		</Layout >
	)
}
