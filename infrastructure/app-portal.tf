module "app_portal" {
  #checkov:skip=CKV_TF_1: Use of commit hash are not required for our Terraform modules
  source = "github.com/Planning-Inspectorate/infrastructure-modules.git//modules/node-app-service?ref=1.40"

  resource_group_name = azurerm_resource_group.primary.name
  location            = module.primary_region.location

  # naming
  app_name        = "portal"
  resource_suffix = var.environment
  service_name    = local.service_name
  tags            = local.tags

  # service plan & scaling
  app_service_plan_id                  = azurerm_service_plan.apps.id
  app_service_plan_resource_group_name = azurerm_resource_group.primary.name
  worker_count                         = var.apps_config.app_service_plan.worker_count # match the app service plan

  # container
  container_registry_name = var.tooling_config.container_registry_name
  container_registry_rg   = var.tooling_config.container_registry_rg
  image_name              = "crown/portal"

  # networking
  app_service_private_dns_zone_id = data.azurerm_private_dns_zone.app_service.id
  inbound_vnet_connectivity       = var.apps_config.private_endpoint_enabled
  integration_subnet_id           = azurerm_subnet.apps.id
  endpoint_subnet_id              = azurerm_subnet.main.id
  outbound_vnet_connectivity      = true
  # public access via Front Door
  front_door_restriction = true
  public_network_access  = true

  # monitoring
  action_group_ids                  = local.action_group_ids
  log_analytics_workspace_id        = azurerm_log_analytics_workspace.main.id
  monitoring_alerts_enabled         = var.alerts_enabled
  health_check_path                 = "/health"
  health_check_eviction_time_in_min = var.health_check_eviction_time_in_min

  #Easy Auth setting
  auth_config = {
    auth_enabled           = var.auth_config_portal.auth_enabled
    require_authentication = var.auth_config_portal.auth_enabled
    auth_client_id         = var.auth_config_portal.auth_client_id
    auth_provider_secret   = "MICROSOFT_PROVIDER_AUTHENTICATION_SECRET"
    auth_tenant_endpoint   = "https://login.microsoftonline.com/${data.azurerm_client_config.current.tenant_id}/v2.0"
    allowed_applications   = var.auth_config_portal.application_id
    allowed_audiences      = "https://${var.web_domains.portal}/.auth/login/aad/callback"
  }

  app_settings = {
    APPLICATIONINSIGHTS_CONNECTION_STRING      = local.key_vault_refs["app-insights-connection-string"]
    ApplicationInsightsAgent_EXTENSION_VERSION = "~3"
    NODE_ENV                                   = var.apps_config.node_environment
    ENVIRONMENT                                = var.environment

    # logging
    LOG_LEVEL = var.apps_config.logging.level

    # database connection
    SQL_CONNECTION_STRING = local.key_vault_refs["sql-app-connection-string"]

    # sessions
    REDIS_CONNECTION_STRING = local.key_vault_refs["redis-connection-string"]
    SESSION_SECRET          = local.key_vault_refs["session-secret-portal"]

    # retries
    RETRY_MAX_ATTEMPTS = "3"
    # got default retry codes
    # https://github.com/sindresorhus/got/blob/main/documentation/7-retry.md
    RETRY_STATUS_CODES = "408,413,429,500,502,503,504,521,522,524"

    #Auth
    MICROSOFT_PROVIDER_AUTHENTICATION_SECRET = local.key_vault_refs["microsoft-provider-authentication-secret"]
    WEBSITE_AUTH_AAD_ALLOWED_TENANTS         = data.azurerm_client_config.current.tenant_id

    # gov notify
    GOV_NOTIFY_DISABLED                        = var.apps_config.gov_notify.disabled
    GOV_NOTIFY_API_KEY                         = local.key_vault_refs["crown-gov-notify-api-key"]
    GOV_NOTIFY_TEST_TEMPLATE_ID                = var.apps_config.gov_notify.templates.test_template_id
    GOV_NOTIFY_PRE_ACK_TEMPLATE_ID             = var.apps_config.gov_notify.templates.pre_ack_template_id
    GOV_NOTIFY_ACK_REP_TEMPLATE_ID             = var.apps_config.gov_notify.templates.ack_rep_template_id
    GOV_NOTIFY_APP_REC_WITH_FEE_TEMPLATE_ID    = var.apps_config.gov_notify.templates.app_rec_with_fee_template_id
    GOV_NOTIFY_APP_REC_WITHOUT_FEE_TEMPLATE_ID = var.apps_config.gov_notify.templates.app_rec_without_fee_template_id
    GOV_NOTIFY_APP_NOT_NAT_IMP_TEMPLATE_ID     = var.apps_config.gov_notify.templates.app_not_nat_imp_template_id

    CROWN_DEV_CONTACT_EMAIL = var.apps_config.contact_email

    # sharepoint
    AZURE_CLIENT_ID     = var.apps_config.auth.client_id
    AZURE_CLIENT_SECRET = local.key_vault_refs["crown-client-secret"]
    AZURE_TENANT_ID     = data.azurerm_client_config.current.tenant_id
    SHAREPOINT_DISABLED = var.apps_config.sharepoint.disabled
    SHAREPOINT_DRIVE_ID = local.key_vault_refs["crown-sharepoint-drive-id"]

    #feature flags
    FEATURE_FLAG_PORTAL_NOT_LIVE = var.apps_config.feature_flags.portal_not_live

    GOOGLE_ANALYTICS_ID = var.apps_config.google_analytics_id
  }

  providers = {
    azurerm         = azurerm
    azurerm.tooling = azurerm.tooling
  }
}

## RBAC for secrets
resource "azurerm_role_assignment" "app_web_secrets_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.app_portal.principal_id
}

## RBAC for secrets (staging slot)
resource "azurerm_role_assignment" "app_web_staging_secrets_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.app_portal.staging_principal_id
}

## sessions
resource "random_password" "session_secret" {
  length  = 32
  special = true
}

resource "azurerm_key_vault_secret" "session_secret" {
  #checkov:skip=CKV_AZURE_41: TODO: Secret rotation
  key_vault_id = azurerm_key_vault.main.id
  name         = "${local.service_name}-session-secret"
  value        = random_password.session_secret.result
  content_type = "session-secret"

  tags = local.tags
}
