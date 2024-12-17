BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[CrownDevelopment] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [CrownDevelopment_id_df] DEFAULT newid(),
    [reference] NVARCHAR(1000) NOT NULL,
    [typeId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000),
    [description] NVARCHAR(1000),
    [lpaId] UNIQUEIDENTIFIER,
    [lpaContactId] UNIQUEIDENTIFIER,
    [applicantContactId] UNIQUEIDENTIFIER,
    [agentContactId] UNIQUEIDENTIFIER,
    [sitePostcode] NVARCHAR(1000),
    [siteEasting] INT,
    [siteNorthing] INT,
    [siteArea] DECIMAL(32,16),
    [expectedDateOfSubmission] DATETIME2,
    [statusId] NVARCHAR(1000),
    [stageId] NVARCHAR(1000),
    [nationallyImportant] BIT,
    [nationallyImportantConfirmationDate] DATETIME2,
    [lpaReference] NVARCHAR(1000),
    [categoryId] NVARCHAR(1000),
    [isGreenBelt] BIT,
    [healthAndSafetyIssue] NVARCHAR(1000),
    [applicationReceivedDate] DATETIME2,
    [applicationAcceptedDate] DATETIME2,
    [lpaQuestionnaireSentDate] DATETIME2,
    [lpaQuestionnaireReceivedDate] DATETIME2,
    [publishDate] DATETIME2,
    [pressNoticeDate] DATETIME2,
    [neighboursNotifiedByLpaDate] DATETIME2,
    [siteNoticeByLpaDate] DATETIME2,
    [targetDecisionDate] DATETIME2,
    [extendedTargetDecisionDate] DATETIME2,
    [recoveredDate] DATETIME2,
    [recoveredReportSentDate] DATETIME2,
    [withdrawnDate] DATETIME2,
    [decisionDate] DATETIME2,
    [originalDecisionDate] DATETIME2,
    [decisionOutcome] NVARCHAR(1000),
    [turnedAwayDate] DATETIME2,
    [representationsPublishDate] DATETIME2,
    [representationsPeriodStartDate] DATETIME2,
    [representationsPeriodEndDate] DATETIME2,
    [projectEmail] NVARCHAR(1000),
    [inspectorId] NVARCHAR(1000),
    [assessorInspectorId] NVARCHAR(1000),
    [caseOfficerId] NVARCHAR(1000),
    [planningOfficerId] NVARCHAR(1000),
    [eiaScreening] BIT,
    [eiaScreeningOutcome] BIT,
    [environmentalStatement] BIT,
    [siteIsVisibleFromPublicLand] BIT,
    [procedureId] NVARCHAR(1000),
    [eventId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [CrownDevelopment_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CrownDevelopment_reference_key] UNIQUE NONCLUSTERED ([reference])
);

-- CreateTable
CREATE TABLE [dbo].[Address] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Address_id_df] DEFAULT newid(),
    [line1] NVARCHAR(1000),
    [line2] NVARCHAR(1000),
    [townCity] NVARCHAR(1000),
    [county] NVARCHAR(1000),
    [postcode] NVARCHAR(1000),
    CONSTRAINT [Address_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Contact] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Contact_id_df] DEFAULT newid(),
    [fullName] NVARCHAR(1000) NOT NULL,
    [telephoneNumber] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [addressId] UNIQUEIDENTIFIER,
    CONSTRAINT [Contact_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Lpa] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Lpa_id_df] DEFAULT newid(),
    [name] NVARCHAR(1000) NOT NULL,
    [pinsCode] NVARCHAR(1000) NOT NULL,
    [onsCode] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Lpa_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Event] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Event_id_df] DEFAULT newid(),
    [date] DATETIME2,
    [duration] NVARCHAR(1000),
    [venue] NVARCHAR(1000),
    [notificationDate] DATETIME2,
    [issuesReportPublishedDate] DATETIME2,
    [procedureNotificationDate] DATETIME2,
    [statementsDate] DATETIME2,
    [caseManagementConferenceDate] DATETIME2,
    CONSTRAINT [Event_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Representation] (
    [id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [Representation_id_df] DEFAULT newid(),
    [reference] NVARCHAR(1000) NOT NULL,
    [projectId] UNIQUEIDENTIFIER NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [originalComment] NVARCHAR(max) NOT NULL,
    [redactedComment] NVARCHAR(max),
    [isRedacted] BIT NOT NULL CONSTRAINT [Representation_isRedacted_df] DEFAULT 0,
    [contactId] UNIQUEIDENTIFIER,
    [receivedDate] DATETIME2 NOT NULL,
    [type] NVARCHAR(1000),
    [representedTypeId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Representation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Representation_reference_key] UNIQUE NONCLUSTERED ([reference])
);

-- CreateTable
CREATE TABLE [dbo].[ApplicationType] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [ApplicationType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ApplicationStatus] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [ApplicationStatus_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ApplicationStage] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [ApplicationStage_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ApplicationProcedure] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [ApplicationProcedure_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Category] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    [parentCategoryId] NVARCHAR(1000),
    CONSTRAINT [Category_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RepresentationType] (
    [id] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000),
    CONSTRAINT [RepresentationType_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[CrownDevelopment] ADD CONSTRAINT [CrownDevelopment_typeId_fkey] FOREIGN KEY ([typeId]) REFERENCES [dbo].[ApplicationType]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CrownDevelopment] ADD CONSTRAINT [CrownDevelopment_lpaId_fkey] FOREIGN KEY ([lpaId]) REFERENCES [dbo].[Lpa]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CrownDevelopment] ADD CONSTRAINT [CrownDevelopment_lpaContactId_fkey] FOREIGN KEY ([lpaContactId]) REFERENCES [dbo].[Contact]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CrownDevelopment] ADD CONSTRAINT [CrownDevelopment_applicantContactId_fkey] FOREIGN KEY ([applicantContactId]) REFERENCES [dbo].[Contact]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CrownDevelopment] ADD CONSTRAINT [CrownDevelopment_agentContactId_fkey] FOREIGN KEY ([agentContactId]) REFERENCES [dbo].[Contact]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CrownDevelopment] ADD CONSTRAINT [CrownDevelopment_statusId_fkey] FOREIGN KEY ([statusId]) REFERENCES [dbo].[ApplicationStatus]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CrownDevelopment] ADD CONSTRAINT [CrownDevelopment_stageId_fkey] FOREIGN KEY ([stageId]) REFERENCES [dbo].[ApplicationStage]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CrownDevelopment] ADD CONSTRAINT [CrownDevelopment_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[Category]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[CrownDevelopment] ADD CONSTRAINT [CrownDevelopment_procedureId_fkey] FOREIGN KEY ([procedureId]) REFERENCES [dbo].[ApplicationProcedure]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Contact] ADD CONSTRAINT [Contact_addressId_fkey] FOREIGN KEY ([addressId]) REFERENCES [dbo].[Address]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Representation] ADD CONSTRAINT [Representation_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[CrownDevelopment]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Representation] ADD CONSTRAINT [Representation_contactId_fkey] FOREIGN KEY ([contactId]) REFERENCES [dbo].[Contact]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Representation] ADD CONSTRAINT [Representation_representedTypeId_fkey] FOREIGN KEY ([representedTypeId]) REFERENCES [dbo].[RepresentationType]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Category] ADD CONSTRAINT [Category_parentCategoryId_fkey] FOREIGN KEY ([parentCategoryId]) REFERENCES [dbo].[Category]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
