export function mapToCoordinatesString(siteCoordinates: number): string {
	return siteCoordinates.toString().padStart(6, '0');
}
