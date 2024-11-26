data "azurerm_client_config" "current" {}

# data "azurerm_subscription" "current" {}

data "azurerm_virtual_network" "tooling" {
  name                = var.tooling_config.network_name
  resource_group_name = var.tooling_config.network_rg

  provider = azurerm.tooling
}

# these are owned by the "common" stack in the infrastructure-environments repo
# https://github.com/Planning-Inspectorate/infrastructure-environments/blob/main/app/stacks/uk-west/common/action-group.tf
# data "azurerm_monitor_action_group" "common" {
#   for_each = tomap(var.common_config.action_group_names)

#   resource_group_name = var.common_config.resource_group_name
#   name                = each.value
# }
