import AddressQuestion from '../components/address/question.js';
import CheckboxQuestion from '../components/checkbox/question.js';
import BooleanQuestion from '../components/boolean/question.js';
import RadioQuestion from '../components/radio/question.js';
import DateQuestion from '../components/date/question.js';
import DatePeriodQuestion from '../components/date-period/question.js';
import TextEntryQuestion from '../components/text-entry/question.js';
import SelectQuestion from '../components/select/question.js';
import SingleLineInputQuestion from '../components/single-line-input/question.js';
import MultiFieldInputQuestion from '../components/multi-field-input/question.js';
import NumberEntryQuestion from '../components/number-entry/question.js';
import UnitOptionEntryQuestion from '../components/unit-option-entry/question.js';

import { COMPONENT_TYPES } from '../index.js';

// This looks a bit grim because so few of our
// Questions overlap with Question correctly.
// Maybe something to fix at some point
/** @type {Record<string, import('./question').Question>} */
export const questionClasses = Object.freeze({
	[COMPONENT_TYPES.ADDRESS]: AddressQuestion,
	[COMPONENT_TYPES.CHECKBOX]: CheckboxQuestion,
	[COMPONENT_TYPES.BOOLEAN]: BooleanQuestion,
	[COMPONENT_TYPES.RADIO]: RadioQuestion,
	[COMPONENT_TYPES.DATE]: DateQuestion,
	[COMPONENT_TYPES.DATE_PERIOD]: DatePeriodQuestion,
	[COMPONENT_TYPES.TEXT_ENTRY]: TextEntryQuestion,
	[COMPONENT_TYPES.SELECT]: SelectQuestion,
	[COMPONENT_TYPES.SINGLE_LINE_INPUT]: SingleLineInputQuestion,
	[COMPONENT_TYPES.MULTI_FIELD_INPUT]: MultiFieldInputQuestion,
	[COMPONENT_TYPES.NUMBER]: NumberEntryQuestion,
	[COMPONENT_TYPES.UNIT_OPTION]: UnitOptionEntryQuestion
});
