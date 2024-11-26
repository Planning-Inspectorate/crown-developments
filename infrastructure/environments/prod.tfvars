crown_infra_config = {
  deploy_connections = true
  network = {
    name = "pins-vnet-common-prod-ukw-001"
    rg   = "pins-rg-common-prod-ukw-001"
  }
}

environment = "prod"

vnet_config = {
  address_space                       = "10.16.12.0/22"
  apps_subnet_address_space           = "10.16.12.0/24"
  main_subnet_address_space           = "10.16.13.0/24"
  secondary_address_space             = "10.16.28.0/22"
  secondary_apps_subnet_address_space = "10.16.28.0/24"
  secondary_subnet_address_space      = "10.16.29.0/24"
}
