export interface GovNotifyOptions {
	personalisation: {
		[key: string]: string;
	};
	reference?: string;
	oneClickUnsubscribeURL?: string;
	emailReplyToId?: string;
}

export interface TemplateIds {
	acknowledgePreNotification: string;
	acknowledgementOfRepresentation: string;
}

export interface NotifyConfig {
	disabled: boolean;
	apiKey: string;
	templateIds: TemplateIds;
}

export interface SendAcknowledgementOfRepresentationPersonalisation {
	reference: string;
	addressee: string;
	applicationDescription: string;
	siteAddress: string;
	submittedDate: string;
	representationReferenceNo: string;
}
