import { getReceivedAppellantDocuments, getReceivedLpaDocuments } from './services.js';
import { initSharepointDrive } from '#util/sharepoint-init.js';

/** @type {import('express').RequestHandler} */
export const renderViewReceivedDocuments = async (request, response) => {
	const caseReference = request.params.caseReference;
	const sharepointDrive = initSharepointDrive(request.session);

	const [applicantData, lpaData] = await Promise.all([
		getReceivedAppellantDocuments(caseReference, sharepointDrive),
		getReceivedLpaDocuments(caseReference, sharepointDrive)
	]);

	response.render('views/documents/view.njk', {
		data: [
			{
				title: 'Received applicant documents',
				rowData: applicantData
			},
			{
				title: 'Received LPA documents',
				rowData: lpaData
			}
		]
	});
};
