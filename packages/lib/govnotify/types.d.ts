export interface GovNotifyOptions {
	personalisation: {
		[key: string]: string;
	};
	reference: string; // optional
	oneClickUnsubscribeURL: string; // optional
	emailReplyToId: string; // optional
}
