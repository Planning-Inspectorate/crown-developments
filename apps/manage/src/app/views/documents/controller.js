import { SharePointDrive } from '@pins/crowndev-sharepoint/src/utils/sharepoint.js';
import { Client } from '@microsoft/microsoft-graph-client';

const client = Client.initWithMiddleware({
	debugLogging: true,
	authProvider: {
		getAccessToken() {
			return process.env.token;
		}
	}
});

/**
 *
 */
export const renderViewReceivedDocuments = async (request, response) => {
	const sharepointDrive = new SharePointDrive(client, process.env.SHAREPOINT_CROWN_DEV_DRIVE_ID || '');
	const rowData = await sharepointDrive.getItemsByPath(`${request.params.caseReference}/Received/Applicant`);

	response.render('views/documents/view.njk', { data: rowData });
};
