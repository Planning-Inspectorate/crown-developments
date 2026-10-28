data "azurerm_virtual_network" "odw" {
  count               = var.odw_config.disabled ? 0 : 1
  name                = var.odw_config.network_name
  resource_group_name = var.odw_config.network_resource_group_name

  provider = azurerm.odw
}

resource "azurerm_virtual_network_peering" "peas_to_odw" {
  count                     = var.odw_config.disabled ? 0 : 1
  name                      = "${local.org}-peer-${local.service_name}-to-odw-${var.environment}"
  remote_virtual_network_id = data.azurerm_virtual_network.odw[0].id
  resource_group_name       = azurerm_virtual_network.main.resource_group_name
  virtual_network_name      = azurerm_virtual_network.main.name
}

resource "azurerm_virtual_network_peering" "odw_to_peas" {
  count                     = var.odw_config.disabled ? 0 : 1
  name                      = "${local.org}-peer-odw-to-${local.service_name}-${var.environment}"
  remote_virtual_network_id = azurerm_virtual_network.main.id
  resource_group_name       = var.odw_config.network_resource_group_name
  virtual_network_name      = var.odw_config.network_name

  provider = azurerm.odw
}
