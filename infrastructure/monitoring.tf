resource "azurerm_log_analytics_workspace" "main" {
  name                = "${local.org}-log-${local.resource_suffix}"
  location            = module.primary_region.location
  resource_group_name = azurerm_resource_group.primary.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  daily_quota_gb      = var.monitoring_config.log_daily_cap

  tags = merge(
    local.tags,
    var.environment == "prod" ? {
      CriticalityRating = "Level 3"
      PersonalData      = "No"
    } : {}
  )
}

resource "azurerm_application_insights" "main" {
  name                 = "${local.org}-ai-${local.resource_suffix}"
  location             = module.primary_region.location
  resource_group_name  = azurerm_resource_group.primary.name
  workspace_id         = azurerm_log_analytics_workspace.main.id
  application_type     = "web"
  daily_data_cap_in_gb = 10

  tags = merge(
    local.tags,
    var.environment == "prod" ? {
      CriticalityRating = "Level 3"
      PersonalData      = "No"
    } : {}
  )
}

# availability test for the portal app
resource "azurerm_application_insights_standard_web_test" "portal" {
  count = var.monitoring_config.app_insights_web_test_enabled ? 1 : 0

  name                    = "${local.org}-ai-swt-${local.resource_suffix}"
  resource_group_name     = azurerm_resource_group.primary.name
  location                = module.primary_region.location
  application_insights_id = azurerm_application_insights.main.id
  geo_locations = [
    "emea-se-sto-edge", # UK West
    "emea-ru-msa-edge", # UK South
    "emea-gb-db3-azr",  # North Europe
    "emea-nl-ams-azr"   # West Europe
  ]
  retry_enabled = true
  enabled       = true

  request {
    # applications list page
    url = "https://${var.web_domains.portal}/applications"
  }
  validation_rules {
    ssl_check_enabled           = true
    ssl_cert_remaining_lifetime = 7
  }

  tags = merge(
    local.tags,
    var.environment == "prod" ? {
      CriticalityRating = "Level 3"
      PersonalData      = "No"
    } : {}
  )
}

resource "azurerm_monitor_metric_alert" "portal_availability" {
  count = var.monitoring_config.app_insights_web_test_enabled ? 1 : 0

  name                = "Portal Availablity - ${local.resource_suffix}"
  resource_group_name = azurerm_resource_group.primary.name
  scopes = [
    azurerm_application_insights_standard_web_test.portal[0].id,
    azurerm_application_insights.main.id
  ]
  description = "Metric alert for standard web test (availability) for the portal app - which also checks the certificate"

  application_insights_web_test_location_availability_criteria {
    web_test_id           = azurerm_application_insights_standard_web_test.portal[0].id
    component_id          = azurerm_application_insights.main.id
    failed_location_count = 1
  }

  action {
    action_group_id = local.action_group_ids.tech
  }

  action {
    action_group_id = local.action_group_ids.service_manager
  }

  action {
    action_group_id = local.action_group_ids.its
  }
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
