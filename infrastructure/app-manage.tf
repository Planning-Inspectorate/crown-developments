module "app_manage" {
  #checkov:skip=CKV_TF_1: Use of commit hash are not required for our Terraform modules
  source = "github.com/Planning-Inspectorate/infrastructure-modules.git//modules/node-app-service?ref=1.29"

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
  endpoint_subnet_id              = azurerm_subnet.main.id
  inbound_vnet_connectivity       = var.apps_config.private_endpoint_enabled
  integration_subnet_id           = azurerm_subnet.apps.id
  outbound_vnet_connectivity      = true

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

    # database connection
    DATABASE_NAME = azurerm_mssql_database.primary.name
    DATABASE_URL  = local.key_vault_refs["sql-app-connection-string"]

    # integrations
    GOV_NOTIFY_API_KEY = local.key_vault_refs["crown-gov-notify-api-key"]
    TEST_MAILBOX       = local.key_vault_refs["crown-test-mailbox"]

    # sessions
    REDIS_CONNECTION_STRING = local.key_vault_refs["redis-connection-string"]
    SESSION_SECRET          = local.key_vault_refs["session-secret-manage"]
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
