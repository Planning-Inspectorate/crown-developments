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
	lpaAcknowledgeReceiptOfQuestionnaire: string;
}

export interface NotifyConfig {
	disabled: boolean;
	apiKey: string;
	templateIds: TemplateIds;
}

export interface CommonNotificationPersonalisation {
	reference: string;
	applicationDescription: string;
	siteAddress: string;
}

export interface SendAcknowledgementOfRepresentationPersonalisation extends CommonNotificationPersonalisation {
	addressee: string;
	submittedDate: string;
	representationReferenceNo: string;
}

export interface LpaAcknowledgeReceiptOfQuestionnairePersonalisation extends CommonNotificationPersonalisation {
	lpaQuestionnaireReceivedDate: string;
	frontOfficeLink: string;
}
