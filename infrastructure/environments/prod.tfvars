# crown_infra_config = {
#   deploy_connections = true
#   network = {
#     name = "pins-vnet-common-prod-uks-001"
#     rg   = "pins-rg-common-prod-uks-001"
#   }
# }

environment = "prod"

vnet_config = {
  address_space                       = "10.20.12.0/22"
  apps_subnet_address_space           = "10.20.12.0/24"
  main_subnet_address_space           = "10.20.13.0/24"
  secondary_address_space             = "10.20.28.0/22"
  secondary_apps_subnet_address_space = "10.20.28.0/24"
  secondary_subnet_address_space      = "10.20.29.0/24"
}
