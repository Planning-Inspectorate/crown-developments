# Dynamic form renderer

> Note this is ported from Appeals: [dynamic forms](https://github.com/Planning-Inspectorate/appeal-planning-decision/tree/main/packages/forms-web-app/src/dynamic-forms), but transformed for ES6 modules and Node Test Runner. Not all functionality has been brought across, such as 'add more'.

## Terminology

- Component - A "blueprint" of a type of question. i.e. input, radio button, checkbox etc.
- Question - A specific question within a journey which is made up of one (usually) or many -(sometimes) components and
  their required content.
- Section - A group of Questions
- Journey - An entire set of questions required for a completion of a submission (either by Appellant or LPA or other
  user type)
- Answer - Data input by a user against a specific Question.
- Response - a collection of answers submitted as part of a Journey.
- Validation - Verification that an individual Answer meets the criteria of that Question. i.e. String is greater than 3
  characters.

## Requirements

To use this package nunjucks must be configured so that the component view files are available, and static assets must be made available for certain components and styling.

### Nunjucks

Nunjucks template paths needs configuring with the govuk-frontend and the dynamic forms folder, e.g.

```ecmascript 6
import { createRequire } from 'node:module';
import path from 'node:path';
import nunjucks from 'nunjucks';

export function configureNunjucks() {
	// get the require function, see https://nodejs.org/api/module.html#modulecreaterequirefilename
	const require = createRequire(import.meta.url);
	// path to dynamic forms folder
	const dynamicFormsRoot = path.resolve(require.resolve('@pins/dynamic-forms'), '..');
	// get the path to the govuk-frontend folder, in node_modules, using the node require resolution
	const govukFrontendRoot = path.resolve(require.resolve('govuk-frontend'), '../..');
	const appDir = path.join('some/path/to/the', 'app');

	// configure nunjucks
	return nunjucks.configure(
		// ensure nunjucks templates can use govuk-frontend components, and templates we've defined in `web/src/app`
		[dynamicFormsRoot, govukFrontendRoot, appDir],
		{
			// output with dangerous characters are escaped automatically
			autoescape: true,
			// automatically remove trailing newlines from a block/tag
			trimBlocks: true,
			// automatically remove leading whitespace from a block/tag
			lstripBlocks: true
		}
	);
}

```

### Assets

The select component can use the [accessibile-autocomplete](https://www.npmjs.com/package/accessible-autocomplete) package. This requires configuring, the component assumes the following paths are available:

* `/assets/css/accessible-autocomplete.min.css`
* `/assets/js/accessible-autocomplete.min.js`

### Layouts

The layout file used for the journey should include the following blocks:

TODO!