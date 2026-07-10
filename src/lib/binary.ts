const SAMPLE_SIZE = 8000;

// A NUL byte anywhere in a leading sample is a reliable binary signal --
// the same heuristic used by git and Perl's `-T` file test. Valid UTF-8
// text never contains NUL.
export function isBinaryBuffer(buffer: Buffer): boolean {
	const sample = buffer.subarray(0, Math.min(buffer.length, SAMPLE_SIZE));
	return sample.includes(0);
}
