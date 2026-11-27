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

data "azurerm_servicebus_namespace" "odw" {
  count               = var.odw_config.disabled ? 0 : 1
  name                = var.odw_config.service_bus_name
  resource_group_name = var.odw_config.resource_group_name

  provider = azurerm.odw
}

## RBAC for service bus Manage
resource "azurerm_role_assignment" "app_manage_odw_service_bus_sender" {
  for_each = var.odw_config.disabled ? {} : {
    app     = module.app_manage.principal_id
    staging = module.app_manage.staging_principal_id
  }

  scope                = data.azurerm_servicebus_namespace.odw[0].id
  role_definition_name = "Azure Service Bus Data Sender"
  principal_id         = each.value

  provider = azurerm.odw
}

## RBAC for service bus Portal
resource "azurerm_role_assignment" "app_portal_odw_service_bus_sender" {
  for_each = var.odw_config.disabled ? {} : {
    app     = module.app_portal.principal_id
    staging = module.app_portal.staging_principal_id
  }

  scope                = data.azurerm_servicebus_namespace.odw[0].id
  role_definition_name = "Azure Service Bus Data Sender"
  principal_id         = each.value

  provider = azurerm.odw
}


