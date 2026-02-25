resource "azurerm_resource_group" "primary" {
  name     = "${local.org}-rg-${local.resource_suffix}"
  location = module.primary_region.location

  tags = merge(
    local.tags,
    var.environment == "prod" ? local.resource_tags["resource_group_primary"] : {}
  )
}

resource "azurerm_resource_group" "secondary" {
  name     = "${local.org}-rg-${local.secondary_resource_suffix}"
  location = module.secondary_region.location

  tags = merge(
    local.tags,
    var.environment == "prod" ? local.resource_tags["resource_group_secondary"] : {}
  )
}

resource "azurerm_key_vault" "main" {
  #checkov:skip=CKV_AZURE_109: TODO: consider firewall settings
  name                          = "${local.org}-kv-${local.resource_suffix}"
  location                      = module.primary_region.location
  resource_group_name           = azurerm_resource_group.primary.name
  enabled_for_disk_encryption   = true
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days    = 7
  purge_protection_enabled      = true
  rbac_authorization_enabled    = true
  public_network_access_enabled = false
  sku_name                      = "standard"

  tags = merge(
    local.tags,
    var.environment == "prod" ? local.resource_tags["key_vault_main"] : {}
  )
}

# secrets to be manually populated
resource "azurerm_key_vault_secret" "manual_secrets" {
  #checkov:skip=CKV_AZURE_41: expiration not valid
  for_each = toset(local.secrets)

  key_vault_id = azurerm_key_vault.main.id
  name         = each.value
  value        = "<terraform_placeholder>"
  content_type = "plaintext"

  tags = merge(
    local.tags,
    var.environment == "prod" ? local.resource_tags["key_vault_secret_manual_secrets"] : {}
  )

  lifecycle {
    ignore_changes = [
      value
    ]
  }
}
