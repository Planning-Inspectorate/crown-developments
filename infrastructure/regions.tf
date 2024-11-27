module "primary_region" {
  source  = "claranet/regions/azurerm"
  version = "7.2.1"

  azure_region = local.primary_location
}

module "secondary_region" {
  source  = "claranet/regions/azurerm"
  version = "7.2.1"

  azure_region = local.secondary_location
}
