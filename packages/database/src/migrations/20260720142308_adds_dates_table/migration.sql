BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[S62aDates] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [S62aDates_id_df] DEFAULT newid(),
    [s62aCaseId] UNIQUEIDENTIFIER NOT NULL,
    [notificationReceivedDate] DATETIME2,
    [applicationReceivedDate] DATETIME2,
    [applicationAcknowledgedDate] DATETIME2,
    [furtherInformationRequestedDate] DATETIME2,
    [agreedForAdditionalInformationDate] DATETIME2,
    [applicationValidDate] DATETIME2,
    [validLettersSentDate] DATETIME2,
    [lpaQuestionnaireSentDate] DATETIME2,
    [lpaQuestionnaireReceivedDate] DATETIME2,
    [targetPublishDate] DATETIME2,
    [publishDate] DATETIME2,
    [pressNoticeDate] DATETIME2,
    [neighboursNotifiedByLpaDate] DATETIME2,
    [lpaInterestedPartiesDeadlineDate] DATETIME2,
    [siteNoticeByLpaDate] DATETIME2,
    [interestedPartiesPressNoticeDeadlineDate] DATETIME2,
    [mineralApplicationsDate] DATETIME2,
    [interimFindingsDate] DATETIME2,
    [reconsultationDetailsSentDate] DATETIME2,
    [reconsultationDetailsDeadlineDate] DATETIME2,
    [s106SubmittedDate] DATETIME2,
    [targetDecisionDate] DATETIME2,
    [extendedTargetDecisionDate] DATETIME2,
    [recoveredDate] DATETIME2,
    [withdrawnDate] DATETIME2,
    [turnedAwayDate] DATETIME2,
    CONSTRAINT [S62aDates_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [S62aDates_s62aCaseId_key] UNIQUE NONCLUSTERED ([s62aCaseId])
);

-- AddForeignKey
ALTER TABLE [dbo].[S62aDates] ADD CONSTRAINT [S62aDates_s62aCaseId_fkey] FOREIGN KEY ([s62aCaseId]) REFERENCES [dbo].[S62aCase]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
