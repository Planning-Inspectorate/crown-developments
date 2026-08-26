import {
	EmailValidator,
	RequiredValidator,
	StringValidator,
	COMPONENT_TYPES
} from '@planning-inspectorate/dynamic-forms';
import { camelCaseToUrlCase, sentenceCase } from '@pins/crowndev-lib/util/string.ts';
import MultiFieldInputValidator from '@pins/crowndev-lib/validators/multi-field-input-validator.js';
import TelephoneNumberValidator from '@pins/crowndev-lib/validators/telephone-number-validator.ts';
import {
	CUSTOM_COMPONENTS,
	type CustomMultiFieldInputQuestionProps
} from '@pins/crowndev-lib/forms/custom-components/index.ts';
import { HIDDEN_TYPE } from '@pins/crowndev-lib/forms/custom-components/custom-multi-field-input/question.js';
import type { SelectableOption } from '@planning-inspectorate/dynamic-forms';

/**
 *
 */
export function multiContactQuestions<TPrefix extends string>({
	prefix,
	title,
	organisationOptions
}: {
	prefix: TPrefix;
	title: string;
	organisationOptions: SelectableOption[] | null;
}): Record<`${TPrefix}ContactDetails`, CustomMultiFieldInputQuestionProps> {
	const prefixUrl = camelCaseToUrlCase(prefix);
	const isNullOption = organisationOptions === null;
	const isSingleOption = Array.isArray(organisationOptions) && organisationOptions.length === 1;

	const formatOrganisationFunction = (value: string): string => {
		const option = organisationOptions && organisationOptions.find((opt) => opt.value === value);
		return option ? option.text : value;
	};

	const questions = {} as Record<`${TPrefix}ContactDetails`, CustomMultiFieldInputQuestionProps>;
	questions[`${prefix}ContactDetails`] = {
		type: CUSTOM_COMPONENTS.CUSTOM_MULTI_FIELD_INPUT,
		title: `${sentenceCase(title)} contact`,
		question: `Add ${title} contact details`,
		fieldName: `${prefix}ContactDetails`,
		url: `${prefixUrl}-contact`,
		inputFields: [
			{
				type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
				fieldName: `${prefix}FirstName`,
				label: 'First name',
				autocomplete: 'given-name',
				formatJoinString: ' '
			},
			{
				type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
				fieldName: `${prefix}LastName`,
				label: 'Last name',
				autocomplete: 'family-name'
			},
			{
				type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
				fieldName: `${prefix}ContactEmail`,
				label: 'Email'
			},
			{
				type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
				fieldName: `${prefix}ContactTelephoneNumber`,
				label: 'Phone number (optional)'
			},
			// Organisation: hidden single value if exactly one option, else radio
			...(isNullOption
				? []
				: isSingleOption
					? [
							{
								type: HIDDEN_TYPE,
								fieldName: `${prefix}ContactOrganisation`,
								value: organisationOptions[0].value,
								formatTextFunction: formatOrganisationFunction
							}
						]
					: [
							{
								type: COMPONENT_TYPES.RADIO,
								fieldName: `${prefix}ContactOrganisation`,
								legend: 'Organisation',
								options: organisationOptions,
								formatTextFunction: formatOrganisationFunction
							}
						])
		],
		validators: [
			new MultiFieldInputValidator({
				fields: [
					{
						fieldName: `${prefix}FirstName`,
						validators: [
							new RequiredValidator(`Enter a first name`),
							new StringValidator({
								maxLength: { maxLength: 250 },
								regex: {
									regex: "^[A-Za-z ''-]+$",
									regexMessage: 'First name must only include letters, spaces, hyphens and apostrophes'
								}
							})
						]
					},
					{
						fieldName: `${prefix}LastName`,
						validators: [
							new RequiredValidator(`Enter a last name`),
							new StringValidator({
								maxLength: { maxLength: 250 },
								regex: {
									regex: "^[A-Za-z ''-]+$",
									regexMessage: 'Last name must only include letters, spaces, hyphens and apostrophes'
								}
							})
						]
					},
					{
						fieldName: `${prefix}ContactEmail`,
						validators: [
							new RequiredValidator(`Enter an email address`),
							new StringValidator({ maxLength: { maxLength: 50 } }),
							new EmailValidator()
						]
					},
					{
						fieldName: `${prefix}ContactTelephoneNumber`,
						validators: [new TelephoneNumberValidator()]
					},
					...(isNullOption || isSingleOption
						? []
						: [
								{
									fieldName: `${prefix}ContactOrganisation`,
									validators: [new RequiredValidator(`Select an organisation for this contact`)]
								}
							])
				]
			})
		]
	};

	return questions;
}
