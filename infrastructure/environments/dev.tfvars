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
  resource_group_name = "pins-rg-common-dev-ukw-001"
  action_group_names = {
    iap      = "pins-ag-odt-iap-dev"
    its      = "pins-ag-odt-its-dev"
    info_sec = "pins-ag-odt-info-sec-dev"
  }
}

environment = "dev"

front_door_config = {
  name        = "pins-fd-common-tooling"
  rg          = "pins-rg-common-tooling"
  ep_name     = "pins-fde-crown"
  use_tooling = true
}

vnet_config = {
  address_space                       = "10.20.0.0/22"
  apps_subnet_address_space           = "10.20.0.0/24"
  main_subnet_address_space           = "10.20.1.0/24"
  secondary_address_space             = "10.20.16.0/22"
  secondary_apps_subnet_address_space = "10.20.16.0/24"
  secondary_subnet_address_space      = "10.20.17.0/24"
}

web_domains = { portal = "crown-dev.planninginspectorate.gov.uk", manage = "crown-manage-dev.planninginspectorate.gov.uk" }

waf_rate_limits = {
  enabled             = true
  duration_in_minutes = 5
  threshold           = 1500
}
