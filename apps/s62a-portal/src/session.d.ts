// note this isn't in the main .d.ts file, as adding an import changes the way typescript handles the file, and it breaks the other module declarations.
// see: https://stackoverflow.com/a/51114250
import 'express-session';

declare module 'express-session' {
	// extend SessionData to include custom values
	// using [declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
	interface SessionData {
		visits?: number;
		[key: string]: unknown;
	}
}
