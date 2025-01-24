locals {
  org                = "pins"
  service_name       = "crown"
  primary_location   = "uk-south"
  secondary_location = "uk-west"

  resource_suffix           = "${local.service_name}-${var.environment}"
  secondary_resource_suffix = "${local.service_name}-secondary-${var.environment}"

  secrets = [
    "crown-client-secret",
    "crown-gov-notify-api-key",
    "crown-test-mailbox",
    "crown-sharepoint-drive-id",
    "crown-sharepoint-root-id",
    "crown-sharepoint-template-folder-id",
    "microsoft-provider-authentication-secret"
  ]

  key_vault_refs = merge(
    {
      for k, v in azurerm_key_vault_secret.manual_secrets : k => "@Microsoft.KeyVault(SecretUri=${v.versionless_id})"
    },
    {
      "app-insights-connection-string" = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.app_insights_connection_string.versionless_id})",
      "redis-connection-string"        = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.redis_web_connection_string.versionless_id})"
      "session-secret-portal"          = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.session_secret.versionless_id})"
      "session-secret-manage"          = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.manage_session_secret.versionless_id})"
      "sql-app-connection-string"      = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.sql_app_connection_string.versionless_id})"
    }
  )

  tags = merge(
    var.tags,
    {
      CreatedBy   = "terraform"
      Environment = var.environment
      ServiceName = local.service_name
      location    = local.primary_location
    }
  )

  tech_emails = [for rec in azurerm_monitor_action_group.crown_tech.email_receiver : rec.email_address]
  action_group_ids = {
    tech            = azurerm_monitor_action_group.crown_tech.id
    service_manager = azurerm_monitor_action_group.crown_service_manager.id
    iap             = data.azurerm_monitor_action_group.common["iap"].id,
    its             = data.azurerm_monitor_action_group.common["its"].id,
    info_sec        = data.azurerm_monitor_action_group.common["info_sec"].id
  }
}
