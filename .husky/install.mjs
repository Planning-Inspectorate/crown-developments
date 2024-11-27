try {
	const husky = (await import('husky')).default;
	console.log(husky());
} catch (e) {
	// may fail if husky isn't installed, e.g. in a production scenario
	console.log('husky installed failed', e);
}
