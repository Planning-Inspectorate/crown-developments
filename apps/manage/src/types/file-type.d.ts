declare module 'file-type' {
	export function fileTypeFromBuffer(buffer: Buffer | Uint8Array): Promise<
		| {
				ext: string;
				mime: string;
		  }
		| undefined
	>;
}
