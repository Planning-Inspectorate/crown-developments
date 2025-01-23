export interface GovNotifyOptions {
	personalisation: {
		[key: string]: string;
	};
	reference: string;
	oneClickUnsubscribeURL: string;
	emailReplyToId: string;
}
