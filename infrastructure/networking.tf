resource "azurerm_virtual_network" "main" {
  name                = "${local.org}-vnet-${local.resource_suffix}"
  location            = module.primary_region.location
  resource_group_name = azurerm_resource_group.primary.name
  address_space       = [var.vnet_config.address_space]

  tags = merge(
    local.tags,
    var.environment == "prod" ? local.resource_tags["virtual_network_main"] : {}
  )
}

resource "azurerm_subnet" "apps" {
  name                              = "${local.org}-snet-${local.service_name}-apps-${var.environment}"
  resource_group_name               = azurerm_resource_group.primary.name
  virtual_network_name              = azurerm_virtual_network.main.name
  address_prefixes                  = [var.vnet_config.apps_subnet_address_space]
  private_endpoint_network_policies = "Enabled"

  delegation {
    name = "delegation"

    service_delegation {
      name = "Microsoft.Web/serverFarms"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/action"
      ]
    }
  }
}

resource "azurerm_subnet" "main" {
  name                              = "${local.org}-snet-${local.resource_suffix}"
  resource_group_name               = azurerm_resource_group.primary.name
  virtual_network_name              = azurerm_virtual_network.main.name
  address_prefixes                  = [var.vnet_config.main_subnet_address_space]
  private_endpoint_network_policies = "Enabled"
}

## peer to tooling VNET for DevOps agents
resource "azurerm_virtual_network_peering" "crown_to_tooling" {
  name                      = "${local.org}-peer-${local.service_name}-to-tooling-${var.environment}"
  remote_virtual_network_id = data.azurerm_virtual_network.tooling.id
  resource_group_name       = azurerm_virtual_network.main.resource_group_name
  virtual_network_name      = azurerm_virtual_network.main.name
}

resource "azurerm_virtual_network_peering" "tooling_to_crown" {
  name                      = "${local.org}-peer-tooling-to-${local.service_name}-${var.environment}"
  remote_virtual_network_id = azurerm_virtual_network.main.id
  resource_group_name       = var.tooling_config.network_rg
  virtual_network_name      = var.tooling_config.network_name

  provider = azurerm.tooling
}

# DNS Zones for Azure Services
# Private DNS Zones exist in the tooling subscription linked here them to Crown VNet
resource "azurerm_private_dns_zone_virtual_network_link" "app_config" {
  name                  = "${local.org}-vnetlink-app-config-${local.resource_suffix}"
  resource_group_name   = var.tooling_config.network_rg
  private_dns_zone_name = data.azurerm_private_dns_zone.app_config.name
  virtual_network_id    = azurerm_virtual_network.main.id

  provider = azurerm.tooling
}

resource "azurerm_private_dns_zone_virtual_network_link" "app_service" {
  name                  = "${local.org}-vnetlink-app-service-${local.resource_suffix}"
  resource_group_name   = var.tooling_config.network_rg
  private_dns_zone_name = data.azurerm_private_dns_zone.app_service.name
  virtual_network_id    = azurerm_virtual_network.main.id

  provider = azurerm.tooling
}

resource "azurerm_private_dns_zone_virtual_network_link" "cognitive" {
  name                  = "${local.org}-vnetlink-cognitive-${local.resource_suffix}"
  resource_group_name   = var.tooling_config.network_rg
  private_dns_zone_name = data.azurerm_private_dns_zone.cognitive.name
  virtual_network_id    = azurerm_virtual_network.main.id

  provider = azurerm.tooling
}

resource "azurerm_private_dns_zone_virtual_network_link" "database" {
  name                  = "${local.org}-vnetlink-db-${local.resource_suffix}"
  resource_group_name   = var.tooling_config.network_rg
  private_dns_zone_name = data.azurerm_private_dns_zone.database.name
  virtual_network_id    = azurerm_virtual_network.main.id

  provider = azurerm.tooling
}

resource "azurerm_private_dns_zone_virtual_network_link" "redis_cache" {
  name                  = "${local.org}-vnetlink-redis-cache-${local.resource_suffix}"
  resource_group_name   = var.tooling_config.network_rg
  private_dns_zone_name = data.azurerm_private_dns_zone.redis_cache.name
  virtual_network_id    = azurerm_virtual_network.main.id

  provider = azurerm.tooling
}

resource "azurerm_private_dns_zone_virtual_network_link" "keyvault" {
  name                  = "${local.org}-vnetlink-keyvault-${local.resource_suffix}"
  resource_group_name   = var.tooling_config.network_rg
  private_dns_zone_name = data.azurerm_private_dns_zone.keyvault.name
  virtual_network_id    = azurerm_virtual_network.main.id

  provider = azurerm.tooling
}

# Private Endpoints
resource "azurerm_private_endpoint" "keyvault" {
  name                = "${local.org}-pe-keyvault-${local.resource_suffix}"
  location            = module.primary_region.location
  resource_group_name = azurerm_resource_group.primary.name
  subnet_id           = azurerm_subnet.main.id

  private_dns_zone_group {
    name                 = "${local.org}-pdns-${local.service_name}-keyvault-${var.environment}"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.keyvault.id]
  }

  private_service_connection {
    name                           = "${local.org}-psc-keyvault-${local.resource_suffix}"
    private_connection_resource_id = azurerm_key_vault.main.id
    subresource_names              = ["vault"]
    is_manual_connection           = false
  }
}
