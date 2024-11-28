resource "azurerm_log_analytics_workspace" "main" {
  name                = "${local.org}-log-${local.resource_suffix}"
  location            = module.primary_region.location
  resource_group_name = azurerm_resource_group.primary.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = local.tags
}

resource "azurerm_application_insights" "main" {
  name                 = "${local.org}-ai-${local.resource_suffix}"
  location             = module.primary_region.location
  resource_group_name  = azurerm_resource_group.primary.name
  workspace_id         = azurerm_log_analytics_workspace.main.id
  application_type     = "web" # should this be Node.JS, or general?
  daily_data_cap_in_gb = 10

  tags = local.tags
}

resource "azurerm_key_vault_secret" "app_insights_connection_string" {
  #checkov:skip=CKV_AZURE_41: expiration not valid
  key_vault_id = azurerm_key_vault.main.id
  name         = "${local.service_name}-app-insights-connection-string"
  value        = azurerm_application_insights.main.connection_string
  content_type = "connection-string"

  tags = local.tags
}

resource "azurerm_monitor_action_group" "crown_tech" {
  name                = "pins-ag-crown-tech-${var.environment}"
  resource_group_name = azurerm_resource_group.primary.name
  short_name          = "CrownDev"
  tags                = local.tags

  # we set emails in the action groups in Azure Portal - to avoid needing to manage emails in terraform
  lifecycle {
    ignore_changes = [
      email_receiver
    ]
  }
}

resource "azurerm_monitor_action_group" "crown_service_manager" {
  name                = "pins-ag-crown-service-manager-${var.environment}"
  resource_group_name = azurerm_resource_group.primary.name
  short_name          = "CrownDev"
  tags                = local.tags

  # we set emails in the action groups in Azure Portal - to avoid needing to manage emails in terraform
  lifecycle {
    ignore_changes = [
      email_receiver
    ]
  }
}
