const schema = (path, journeyResponse, documentType, errorMsg = 'Select a file to upload') => ({
	[path]: {
		custom: {
			options: async (value, { req }) => {
				if (!req.files) {
					const uploadedFiles = journeyResponse.answers.SubmissionDocumentUpload || [];

					const relevantUploadedFiles = uploadedFiles.filter((upload) => upload.type === documentType);

					if (relevantUploadedFiles) {
						//at this stage, uploadedFiles will still contain any files flagged for removal
						//so we need to disregard them when checking uploadedFiles
						let removedFiles = [];

						if ('removedFiles' in req.body) {
							removedFiles = JSON.parse(req.body.removedFiles) || [];
						}

						if (relevantUploadedFiles.length - removedFiles.length < 1) {
							throw new Error(errorMsg);
						}

						return true;
					}

					throw new Error(errorMsg);
				}

				return true;
			}
		}
	}
});

export default schema;
