# crown_infra_config = {
#   deploy_connections = true
#   network = {
#     name = "pins-vnet-common-training-uks-001"
#     rg   = "pins-rg-common-training-uks-001"
#   }
# }

environment = "training"

vnet_config = {
  address_space                       = "10.20.8.0/22"
  apps_subnet_address_space           = "10.20.8.0/24"
  main_subnet_address_space           = "10.20.9.0/24"
  secondary_address_space             = "10.20.24.0/22"
  secondary_apps_subnet_address_space = "10.20.24.0/24"
  secondary_subnet_address_space      = "10.20.25.0/24"
}
