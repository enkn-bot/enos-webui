export type EnosDesktopProjectArchive = {
	action: 'exportProjectArchive';
	format: 'tar';
	encoding: 'base64';
	rootName: string;
	bytes: number;
	data: string;
	excluded?: string[];
};

export type CloudImportResult = {
	imported_bytes: number;
	dest: string;
};

export const decodeProjectArchive = (archive: EnosDesktopProjectArchive): Uint8Array => {
	if (archive?.action !== 'exportProjectArchive') {
		throw new Error('Invalid project archive action');
	}
	if (archive.format !== 'tar' || archive.encoding !== 'base64') {
		throw new Error('Unsupported project archive format');
	}
	if (!archive.data) {
		throw new Error('Project archive is empty');
	}

	const binary = atob(archive.data);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
};

export const cloudProjectContextSource = (
	archive: Pick<EnosDesktopProjectArchive, 'rootName' | 'bytes'>,
	imported: CloudImportResult
) => ({
	kind: 'cloud',
	rootName: archive.rootName?.trim() || 'Cloud project',
	cloudPath: imported.dest || '/home/user',
	importedBytes: imported.imported_bytes ?? archive.bytes
});
