locals {
  # objects don't match so we build an object which just the properties we need
  # to avoid error "The true and false result expressions must have consistent types."
  text_analytics_instance = var.text_analytics_config.deploy ? {
    id : azurerm_cognitive_account.text_analytics[0].id,
    endpoint : azurerm_cognitive_account.text_analytics[0].endpoint,
    } : {
    id : data.azurerm_cognitive_account.text_analytics.id,
    endpoint : data.azurerm_cognitive_account.text_analytics.endpoint,
  }
  text_analytics_endpoint = local.text_analytics_instance.endpoint
}

# shared instance for non-live environments
data "azurerm_cognitive_account" "text_analytics" {
  name                = var.tooling_config.text_analytics_name
  resource_group_name = var.tooling_config.network_rg

  provider = azurerm.tooling
}

resource "azurerm_role_assignment" "app_manage_language_reader" {
  scope                = local.text_analytics_instance.id
  role_definition_name = "Cognitive Services Language Reader"
  principal_id         = module.app_manage.principal_id
}

# Crown specific instance for live environment
resource "azurerm_cognitive_account" "text_analytics" {
  count = var.text_analytics_config.deploy ? 1 : 0

  #checkov:skip=CKV2_AZURE_22: customer-managed keys not implemented yet
  name                          = "pins-lang-${local.resource_suffix}"
  location                      = azurerm_resource_group.primary.location
  resource_group_name           = azurerm_resource_group.primary.name
  kind                          = "TextAnalytics"
  public_network_access_enabled = false
  local_auth_enabled            = false
  custom_subdomain_name         = "pins-lang-${local.resource_suffix}"

  sku_name = "S"

  identity {
    type = "SystemAssigned"
  }

  tags = merge(
    local.tags,
    var.environment == "prod" ? local.resource_tags["cognitive_account_text_analytics"] : {}
  )
}

resource "azurerm_private_endpoint" "text_analytics" {
  count = var.text_analytics_config.deploy ? 1 : 0

  name                = "pins-pe-lang-${local.resource_suffix}"
  location            = azurerm_resource_group.primary.location
  resource_group_name = azurerm_resource_group.primary.name
  subnet_id           = azurerm_subnet.main.id

  private_dns_zone_group {
    name                 = "azure-lang-private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.cognitive.id]
  }

  private_service_connection {
    name                           = "privateendpointconnection"
    private_connection_resource_id = azurerm_cognitive_account.text_analytics[0].id
    subresource_names              = ["account"]
    is_manual_connection           = false
  }

  tags = merge(
    local.tags,
    var.environment == "prod" ? local.resource_tags["private_endpoint_text_analytics"] : {}
  )
}
