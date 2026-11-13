import React from "react";
import Header from "./Header";
import Footer from "./Footer";

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<div>
			<Header />
			<main className="min-h-screen my-5">{children}</main>
			<Footer />
		</div >
	);
}
