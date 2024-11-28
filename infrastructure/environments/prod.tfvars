# A-Z
apps_config = {
  app_service_plan_sku     = "P0v3"
  node_environment         = "development"
  private_endpoint_enabled = false

  logging = {
    level_file   = "silent"
    level_stdout = "info"
  }

  redis = {
    capacity = 0
    family   = "C"
    sku_name = "Basic"
  }
}

common_config = {
  resource_group_name = "pins-rg-common-prod-ukw-001"
  action_group_names = {
    iap      = "pins-ag-odt-iap-prod"
    its      = "pins-ag-odt-its-prod"
    info_sec = "pins-ag-odt-info-sec-prod"
  }
}

environment = "prod"

front_door_config = {
  name        = "pins-fd-common-prod"
  rg          = "pins-rg-common-prod"
  ep_name     = "pins-fde-crown"
  use_tooling = true
}

# web_domains = "crown-training.planninginspectorate.gov.uk"

vnet_config = {
  address_space                       = "10.20.12.0/22"
  apps_subnet_address_space           = "10.20.12.0/24"
  main_subnet_address_space           = "10.20.13.0/24"
  secondary_address_space             = "10.20.28.0/22"
  secondary_apps_subnet_address_space = "10.20.28.0/24"
  secondary_subnet_address_space      = "10.20.29.0/24"
}
