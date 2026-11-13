import React from "react";
import Layout from "../components/Layout/Layout";
import GoodsWrapper from "../components/goods/goodsWrapper";

export default function Home() {

	return (
		<Layout>
			<h1 className="text-4xl text-center font-bold py-3">Catalog</h1>
			<GoodsWrapper vendor_id={null} />
		</Layout>
	);
}

