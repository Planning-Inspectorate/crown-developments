resource "azurerm_virtual_network" "main" {
  name                = "${local.org}-vnet-${local.resource_suffix}"
  location            = module.primary_region.location
  resource_group_name = azurerm_resource_group.primary.name
  address_space       = [var.vnet_config.address_space]

  tags = var.tags
}

resource "azurerm_subnet" "apps" {
  name                              = "${local.org}-snet-${local.service_name}-apps-${var.environment}"
  resource_group_name               = azurerm_resource_group.primary.name
  virtual_network_name              = azurerm_virtual_network.main.name
  address_prefixes                  = [var.vnet_config.apps_subnet_address_space]
  private_endpoint_network_policies = "Enabled"

  # for app services
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
resource "azurerm_virtual_network_peering" "crown_tooling" {
  name                      = "${local.org}-peer-${local.service_name}-to-tooling-${var.environment}"
  remote_virtual_network_id = data.azurerm_virtual_network.tooling.id
  resource_group_name       = azurerm_virtual_network.main.resource_group_name
  virtual_network_name      = azurerm_virtual_network.main.name
}

resource "azurerm_virtual_network_peering" "tooling_crown" {
  name                      = "${local.org}-peer-tooling-to-${local.service_name}-${var.environment}"
  remote_virtual_network_id = azurerm_virtual_network.main.id
  resource_group_name       = var.tooling_config.network_rg
  virtual_network_name      = var.tooling_config.network_name

  provider = azurerm.tooling
}
