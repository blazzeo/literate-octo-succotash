import React from "react";
import Layout from "./../components/layout/Layout"
import GoodsWrapper from "./../components/goods/GoodsWrapper";

export default function MyGoodPage() {
	const vendor_id = localStorage.getItem('user_id')

	return (
		<Layout>
			{/*	Heading */}
			<h2 className="text-4xl text-center font-bold py-3">My Goods</h2>

			{/*	Goods List */}
			<GoodsWrapper vendor_id={vendor_id} />
		</Layout>
	)
}
