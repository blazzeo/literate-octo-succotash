import React from "react";

interface ConfirmModalProps {
	title: string;
	message: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, message, onConfirm, onCancel }) => {
	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full">
				<h2 className="text-lg font-bold text-gray-800 mb-3">{title}</h2>
				<p className="text-gray-600 mb-5">{message}</p>
				<div className="flex justify-end gap-3">
					<button
						onClick={onConfirm}
						className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
					>
						Yes
					</button>
					<button
						onClick={onCancel}
						className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
};
