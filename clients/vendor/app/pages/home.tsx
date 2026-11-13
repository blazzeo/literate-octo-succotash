import React from "react";
import Layout from "../components/layout/Layout";
import GoodsWrapper from "../components/goods/GoodsWrapper";

export default function Home() {

	return (
		<Layout>
			<div>
				<h2 className="text-4xl text-center font-bold py-3">Catalog</h2>

				<GoodsWrapper vendor_id={null} />
			</div>
		</Layout>
	);
}

