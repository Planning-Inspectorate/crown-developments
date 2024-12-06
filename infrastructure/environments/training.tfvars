# A-Z
apps_config = {
  app_service_plan_sku     = "P0v3"
  node_environment         = "development"
  private_endpoint_enabled = false

  auth = {
    client_id                = "7776e82e-bbeb-4fe4-abf1-6359c4d31194"
    group_application_access = "409896aa-b295-4992-9ead-c580b64d7a6c"
  }

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
  resource_group_name = "pins-rg-common-training-ukw-001"
  action_group_names = {
    iap      = "pins-ag-odt-iap-training"
    its      = "pins-ag-odt-its-training"
    info_sec = "pins-ag-odt-info-sec-training"
  }
}

environment = "training"

front_door_config = {
  name        = "pins-fd-common-tooling"
  rg          = "pins-rg-common-tooling"
  ep_name     = "pins-fde-crowndev"
  use_tooling = true
}

sql_config = {
  admin = {
    login_username = "pins-crown-sql-training"
    object_id      = "7c8f7774-4863-4d99-a2e6-4230abce623c"
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
  address_space                       = "10.20.8.0/22"
  apps_subnet_address_space           = "10.20.8.0/24"
  main_subnet_address_space           = "10.20.9.0/24"
  secondary_address_space             = "10.20.24.0/22"
  secondary_apps_subnet_address_space = "10.20.24.0/24"
  secondary_subnet_address_space      = "10.20.25.0/24"
}

web_domains = { portal = "crown-training.planninginspectorate.gov.uk", manage = "crown-manage-training.planninginspectorate.gov.uk" }

waf_rate_limits = {
  enabled             = true
  duration_in_minutes = 5
  threshold           = 1500
}
