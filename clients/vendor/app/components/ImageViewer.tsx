import React, { useState, useEffect } from "react";

interface ImageViewerProps {
	images: string[];
	autoPlayInterval?: number;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
	images,
	autoPlayInterval = 3000,
}) => {
	const [currentIndex, setCurrentIndex] = useState(0);

	const prevImage = () => {
		setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
	};

	const nextImage = () => {
		setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
	};

	useEffect(() => {
		if (images.length > 1) {
			const interval = setInterval(nextImage, autoPlayInterval);
			return () => clearInterval(interval);
		}
	}, [currentIndex, autoPlayInterval]);

	if (!images || images.length === 0) return <div>No images</div>;

	return (
		<div className="flex flex-col items-center space-y-4 w-full">
			<div className="relative w-full max-w-3xl aspect-[4/3] flex items-center justify-center border border-gray-300 rounded overflow-hidden">
				<img
					src={images[currentIndex]}
					alt={`slide-${currentIndex}`}
					className="object-contain w-full h-full transition-transform duration-500"
				/>

				<button
					onClick={prevImage}
					disabled={images.length < 2}
					className="h-full px-3 sm:px-6 text-xl sm:text-3xl py-2 bg-gray-100 hover:bg-gray-300 absolute left-0"
				>
					◀
				</button>
				<button
					onClick={nextImage}
					disabled={images.length < 2}
					className="h-full px-3 sm:px-6 text-xl sm:text-3xl py-2 bg-gray-100 hover:bg-gray-300 absolute right-0"
				>
					▶
				</button>
			</div>

			<div className="flex space-x-2">
				{images.map((_, index) => (
					<span
						key={index}
						onClick={() => setCurrentIndex(index)}
						className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full cursor-pointer transition-colors ${index === currentIndex ? "bg-blue-500" : "bg-gray-300"
							}`}
					></span>
				))}
			</div>
		</div>
	);
};

export default ImageViewer;
