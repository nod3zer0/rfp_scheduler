type Toast = {
	id: string;
	message: string;
	type: 'success' | 'error' | 'info';
};

function createToastStore() {
	let toasts = $state<Toast[]>([]);

	function add(message: string, type: Toast['type'] = 'info') {
		const id = Math.random().toString(36).slice(2);
		toasts = [...toasts, { id, message, type }];
		setTimeout(() => remove(id), 3500);
	}

	function remove(id: string) {
		toasts = toasts.filter((t) => t.id !== id);
	}

	return {
		get toasts() {
			return toasts;
		},
		success: (msg: string) => add(msg, 'success'),
		error: (msg: string) => add(msg, 'error'),
		info: (msg: string) => add(msg, 'info'),
		remove
	};
}

export const toastStore = createToastStore();
