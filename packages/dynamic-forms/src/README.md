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

## Usage

### Conditions

Conditions are used to show/hide questions based on the answers to other questions. There are fluent methods on a Section
to add conditions to questions in multiple ways.

The simplest condition applies to just one question:

```ecmascript 6
import { questionHasAnswer } from '@pins/dynamic-forms/src/components/utils/question-has-answer';

new Section('section-key', 'Section title')
        .addQuestion(questions.q1)
        .addQuestion(questions.q2)
        .withCondition((response) => questionHasAnswer(response, questions.q1, 'yes'))
```

In this scenario question two will only be shown if question one has an answer of 'yes'.

Conditions can also be added to an entire section:

```ecmascript 6
new Section('section-key', 'Section title')
        .withSectionCondition((response) => questionHasAnswer(response, questions.q1, 'yes'))
        .addQuestion(questions.q3)
        .addQuestion(questions.q4)
        .withCondition((response) => questionHasAnswer(response, questions.q3, 'yes'))
```

In this case q3 and q4 will only be shown if q1 (from a previous section) is answered 'yes'. Q4 will only show if q1 is
answered 'yes' _and_ q3 is answered 'yes'.

Finally, conditions can be added to multiple questions - these can overlap:

```ecmascript 6
new Section('section-key', 'Section title')
        .withSectionCondition((response) => questionHasAnswer(response, questions.q1, 'yes'))
        .addQuestion(questions.q2)
        .startMultiQuestionCondition('group-1', (response) => questionHasAnswer(response, questions.q2, 'valid'))
        .addQuestion(questions.q3)
        .addQuestion(questions.q4)
        .withCondition((response) => questionHasAnswer(response, questions.q3, 'yes'))
        .endMultiQuestionCondition('group-1')
        .addQuestion(questions.q5)
        .withCondition((response) => questionHasAnswer(response, questions.q4, 'yes'))
        .startMultiQuestionCondition('group-2', (response) => questionHasAnswer(response, questions.q5, 90))
        .addQuestion(questions.q6)
        .addQuestion(questions.q7)
        .endMultiQuestionCondition('group-2')
```

These conditions combine with individual conditions and section conditions. In the above scenario, the following applies:

| Question | Section Condition | Group Conditions | Question Conditions |
|----------|-------------------|------------------|---------------------|
| q2       | q1 = 'yes'        | N/A              | N/A                 |
| q3       | q1 = 'yes'        | q2 = 'valid'     | N/A                 |
| q4       | q1 = 'yes'        | q2 = 'valid'     | q3 = 'yes'          |
| q5       | q1 = 'yes'        | N/A              | q4 = 'yes'          |
| q6       | q1 = 'yes'        | q5 = 90          | N/A                 |
| q7       | q1 = 'yes'        | q5 = 90          | N/A                 |

