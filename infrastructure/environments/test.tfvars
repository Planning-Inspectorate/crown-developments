# crown_infra_config = {
#   deploy_connections = true
#   network = {
#     name = "pins-vnet-common-test-uks-001"
#     rg   = "pins-rg-common-test-uks-001"
#   }
# }

environment = "test"

vnet_config = {
  address_space                       = "10.16.4.0/22"
  apps_subnet_address_space           = "10.16.4.0/24"
  main_subnet_address_space           = "10.16.5.0/24"
  secondary_address_space             = "10.16.20.0/22"
  secondary_apps_subnet_address_space = "10.16.20.0/24"
  secondary_subnet_address_space      = "10.16.21.0/24"
}
