# A-Z
apps_config = {
  app_service_plan_sku     = "P0v3"
  node_environment         = "development"
  private_endpoint_enabled = false

  auth = {
    client_id                = "d53a5c3f-47e8-4f0b-bdf6-fb1a532f293b"
    group_application_access = "0041a68f-91cf-4d41-8b0d-0174cf2b2481"
  }

  logging = {
    level = "info"
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
  ep_name     = "pins-fde-crowndev"
  use_tooling = true
}

sql_config = {
  admin = {
    login_username = "pins-crown-sql-dev"
    object_id      = "1c69f6a2-c0ef-42fa-b754-5da26608299f"
  }
  sku_name    = "Basic"
  max_size_gb = 2
  retention = {
    audit_days             = 7
    short_term_days        = 7
    long_term_weekly       = "P1W"
    long_term_monthly      = "P1M"
    long_term_yearly       = "P1Y"
    long_term_week_of_year = 1
  }
  public_network_access_enabled = true
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
