export function getMemberColor(memberId: string, customColor?: string | null): string {
	if (customColor) return customColor;

	let hash = 0;
	for (let i = 0; i < memberId.length; i++) {
		hash = (hash * 31 + memberId.charCodeAt(i)) >>> 0;
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
