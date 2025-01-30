module "app_manage" {
  #checkov:skip=CKV_TF_1: Use of commit hash are not required for our Terraform modules
  source = "github.com/Planning-Inspectorate/infrastructure-modules.git//modules/node-app-service?ref=1.37"

  resource_group_name = azurerm_resource_group.primary.name
  location            = module.primary_region.location

  # naming
  app_name        = "manage"
  resource_suffix = var.environment
  service_name    = local.service_name
  tags            = local.tags

  # service plan
  app_service_plan_id                  = azurerm_service_plan.apps.id
  app_service_plan_resource_group_name = azurerm_resource_group.primary.name

  # container
  container_registry_name = var.tooling_config.container_registry_name
  container_registry_rg   = var.tooling_config.container_registry_rg
  image_name              = "crown/manage"

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

  app_settings = {
    APPLICATIONINSIGHTS_CONNECTION_STRING      = local.key_vault_refs["app-insights-connection-string"]
    ApplicationInsightsAgent_EXTENSION_VERSION = "~3"
    NODE_ENV                                   = var.apps_config.node_environment
    ENVIRONMENT                                = var.environment

    APP_HOSTNAME                  = var.web_domains.manage
    AUTH_CLIENT_ID                = var.apps_config.auth.client_id
    AUTH_CLIENT_SECRET            = local.key_vault_refs["crown-client-secret"]
    AUTH_GROUP_APPLICATION_ACCESS = var.apps_config.auth.group_application_access
    AUTH_TENANT_ID                = data.azurerm_client_config.current.tenant_id

    #Sharepoint
    SHAREPOINT_DISABLED         = var.apps_config.sharepoint.disabled
    SHAREPOINT_DRIVE_ID         = local.key_vault_refs["crown-sharepoint-drive-id"]
    SHAREPOINT_ROOT_ID          = local.key_vault_refs["crown-sharepoint-root-id"]
    SHAREPOINT_CASE_TEMPLATE_ID = local.key_vault_refs["crown-sharepoint-template-folder-id"]

    # logging
    LOG_LEVEL = var.apps_config.logging.level

    # database connection
    SQL_CONNECTION_STRING = local.key_vault_refs["sql-app-connection-string"]

    # sessions
    REDIS_CONNECTION_STRING = local.key_vault_refs["redis-connection-string"]
    SESSION_SECRET          = local.key_vault_refs["session-secret-manage"]

    #Auth
    MICROSOFT_PROVIDER_AUTHENTICATION_SECRET = local.key_vault_refs["microsoft-provider-authentication-secret"]
    WEBSITE_AUTH_AAD_ALLOWED_TENANTS         = data.azurerm_client_config.current.tenant_id

    # gov notify
    GOV_NOTIFY_API_KEY          = local.key_vault_refs["crown-gov-notify-api-key"]
    GOV_NOTIFY_TEST_TEMPLATE_ID = var.apps_config.gov_notify.templates.test_template_id
  }

  providers = {
    azurerm         = azurerm
    azurerm.tooling = azurerm.tooling
  }
}

## RBAC for secrets
resource "azurerm_role_assignment" "app_manage_secrets_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.app_manage.principal_id
}

## RBAC for secrets (staging slot)
resource "azurerm_role_assignment" "app_manage_staging_secrets_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.app_manage.staging_principal_id
}

## sessions
resource "random_password" "manage_session_secret" {
  length  = 32
  special = true
}

resource "azurerm_key_vault_secret" "manage_session_secret" {
  #checkov:skip=CKV_AZURE_41: TODO: Secret rotation
  key_vault_id = azurerm_key_vault.main.id
  name         = "${local.service_name}-manage-session-secret"
  value        = random_password.manage_session_secret.result
  content_type = "session-secret"

  tags = local.tags
}
