BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[S62aEvent] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [S62aEvent_id_df] DEFAULT newid(),
    [s62aCaseId] UNIQUEIDENTIFIER NOT NULL,
    [procedureNotificationDate] DATETIME2,
    [hearingDate] DATETIME2,
    [prepDuration] DECIMAL(6,2),
    [sittingDuration] DECIMAL(6,2),
    [reportingDuration] DECIMAL(6,2),
    [venue] NVARCHAR(250),
    [notificationDate] DATETIME2,
    [additionalMeetingDate] DATETIME2,
    [issuesReportingPublishedDate] DATETIME2,
    [siteVisitDate] DATETIME2,
    [siteVisitTypeId] NVARCHAR(1000),
    CONSTRAINT [S62aEvent_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [S62aEvent_s62aCaseId_key] UNIQUE NONCLUSTERED ([s62aCaseId])
);

-- CreateTable
CREATE TABLE [dbo].[S62aSiteVisitType] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [S62aSiteVisitType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[S62aEvent] ADD CONSTRAINT [S62aEvent_s62aCaseId_fkey] FOREIGN KEY ([s62aCaseId]) REFERENCES [dbo].[S62aCase]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[S62aEvent] ADD CONSTRAINT [S62aEvent_siteVisitTypeId_fkey] FOREIGN KEY ([siteVisitTypeId]) REFERENCES [dbo].[S62aSiteVisitType]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
