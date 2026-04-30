export function getMemberColor(name: string): string {
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
	}
	const hue = hash % 360;
	return `hsl(${hue}, 65%, 55%)`;
}

export function getMemberInitials(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.map((w) => w[0]?.toUpperCase() ?? '')
		.slice(0, 2)
		.join('');
}
