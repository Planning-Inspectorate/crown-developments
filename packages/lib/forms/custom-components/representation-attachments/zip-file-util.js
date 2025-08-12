// Returns a Buffer containing a minimal valid ZIP file
export function createMinimalZipBuffer() {
	// Minimal ZIP file: local file header + end of central directory record
	return Buffer.from([
		0x50,
		0x4b,
		0x03,
		0x04, // Local file header signature
		0x14,
		0x00, // Version needed to extract
		0x00,
		0x00, // General purpose bit flag
		0x00,
		0x00, // Compression method
		0x00,
		0x00, // File last mod time
		0x00,
		0x00, // File last mod date
		0x00,
		0x00,
		0x00,
		0x00, // CRC-32
		0x00,
		0x00,
		0x00,
		0x00, // Compressed size
		0x00,
		0x00,
		0x00,
		0x00, // Uncompressed size
		0x00,
		0x00, // File name length
		0x00,
		0x00, // Extra field length
		// No file name, no extra field, no file data
		0x50,
		0x4b,
		0x05,
		0x06, // End of central directory signature
		0x00,
		0x00, // Number of this disk
		0x00,
		0x00, // Disk where central directory starts
		0x00,
		0x00, // Number of central directory records on this disk
		0x00,
		0x00, // Total number of central directory records
		0x00,
		0x00,
		0x00,
		0x00, // Size of central directory (bytes)
		0x00,
		0x00,
		0x00,
		0x00, // Offset of start of central directory
		0x00,
		0x00 // Comment length
	]);
}
