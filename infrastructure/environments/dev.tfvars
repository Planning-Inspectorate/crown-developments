# crown_infra_config = {
#   deploy_connections = true
#   network = {
#     name = "pins-vnet-common-dev-ukw-001"
#     rg   = "pins-rg-common-dev-ukw-001"
#   }
# }

environment = "dev"

vnet_config = {
  address_space                       = "10.20.0.0/22"
  apps_subnet_address_space           = "10.20.0.0/24"
  main_subnet_address_space           = "10.20.1.0/24"
  secondary_address_space             = "10.20.16.0/22"
  secondary_apps_subnet_address_space = "10.20.16.0/24"
  secondary_subnet_address_space      = "10.20.17.0/24"
}

# web_app_domain = "crown-dev.planninginspectorate.gov.uk"

# waf_rate_limits = {
#   enabled             = true
#   duration_in_minutes = 5
#   threshold           = 1500
# }
