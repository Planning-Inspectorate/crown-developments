# A-Z
apps_config = {
  app_service_plan_sku     = "P0v3"
  node_environment         = "production"
  private_endpoint_enabled = true

  auth = {
    client_id                = "30a34d1a-473e-4a7f-ad6d-fa574c52a509"
    group_application_access = "1abf7720-2ea6-479e-822d-218917d3d0ee"
  }

  entra = {
    group_ids = {
      case_officers = "" # TODO
      inspectors    = "" # TODO
    }
  }

  logging = {
    level = "warn"
  }

  redis = {
    capacity = 0
    family   = "C"
    sku_name = "Basic"
  }

  gov_notify = {
    templates = {
      test_template_id = "" # TODO
    }
  }

  sharepoint = {
    disabled = false
  }
}

auth_config_portal = {
  auth_enabled   = false
  auth_client_id = "8e64dbf3-99f8-4b31-94ee-b621ad68c56f"
  application_id = "9efb011c-9c7d-450d-938d-5c8ebab05d30"
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
  ep_name     = "pins-fde-crowndev"
  use_tooling = true
}

sql_config = {
  admin = {
    login_username = "pins-crown-sql-prod"
    object_id      = "00d052c3-0a51-4f7d-93fc-7c366877aed6"
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

web_domains = { portal = "crown-developments.planninginspectorate.gov.uk", manage = "crown-developments-manage.planninginspectorate.gov.uk" }

vnet_config = {
  address_space                       = "10.20.12.0/22"
  apps_subnet_address_space           = "10.20.12.0/24"
  main_subnet_address_space           = "10.20.13.0/24"
  secondary_address_space             = "10.20.28.0/22"
  secondary_apps_subnet_address_space = "10.20.28.0/24"
  secondary_subnet_address_space      = "10.20.29.0/24"
}

waf_rate_limits = {
  enabled             = true
  duration_in_minutes = 5
  threshold           = 1500
}
