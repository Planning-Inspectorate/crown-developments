# A-Z
apps_config = {
  app_service_plan_sku     = "P0v3"
  node_environment         = "production"
  private_endpoint_enabled = true

  auth = {
    client_id                = "ce13607b-4065-4f3f-92a8-aac2b13edd81"
    group_application_access = "6094f824-8941-4536-aa7f-6d5cc60d0bbe"
  }

  entra = {
    group_ids = {
      # use app access group for now
      case_officers = "6094f824-8941-4536-aa7f-6d5cc60d0bbe"
      inspectors    = "6094f824-8941-4536-aa7f-6d5cc60d0bbe"
    }
  }

  logging = {
    level = "info"
  }

  redis = {
    capacity = 0
    family   = "C"
    sku_name = "Basic"
  }

  gov_notify = {
    templates = {
      test_template_id = "4b8adfb1-1b7c-4333-b512-761eeedfdca2"
    }
  }

  sharepoint = {
    disabled = false
  }
}

auth_config_portal = {
  auth_enabled   = true
  auth_client_id = "8e64dbf3-99f8-4b31-94ee-b621ad68c56f"
}

common_config = {
  resource_group_name = "pins-rg-common-test-ukw-001"
  action_group_names = {
    iap      = "pins-ag-odt-iap-test"
    its      = "pins-ag-odt-its-test"
    info_sec = "pins-ag-odt-info-sec-test"
  }
}

environment = "test"

front_door_config = {
  name        = "pins-fd-common-tooling"
  rg          = "pins-rg-common-tooling"
  ep_name     = "pins-fde-crowndev"
  use_tooling = true
}

sql_config = {
  admin = {
    login_username = "pins-crown-sql-test"
    object_id      = "00efde19-3c23-4850-b56d-8de1cd10d200"
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
  address_space                       = "10.20.4.0/22"
  apps_subnet_address_space           = "10.20.4.0/24"
  main_subnet_address_space           = "10.20.5.0/24"
  secondary_address_space             = "10.20.20.0/22"
  secondary_apps_subnet_address_space = "10.20.20.0/24"
  secondary_subnet_address_space      = "10.20.21.0/24"
}

web_domains = { portal = "crown-test.planninginspectorate.gov.uk", manage = "crown-manage-test.planninginspectorate.gov.uk" }

waf_rate_limits = {
  enabled             = true
  duration_in_minutes = 5
  threshold           = 1500
}
