# variables should be sorted A-Z

variable "crown_infra_config" {
  description = "Config for the front office infra"
  type = object({
    deploy_connections = bool
    network = object({
      name = string
      rg   = string
    })
  })
}

variable "environment" {
  description = "The name of the environment in which resources will be deployed"
  type        = string
}

variable "tags" {
  description = "A collection of tags to assign to taggable resources"
  type        = map(string)
  default     = {}
}

variable "tooling_config" {
  description = "Config for the tooling subscription resources"
  type = object({
    container_registry_name = string
    container_registry_rg   = string
    network_name            = string
    network_rg              = string
    subscription_id         = string
  })
}

variable "vnet_config" {
  description = "VNet configuration"
  type = object({
    address_space                       = string
    apps_subnet_address_space           = string
    main_subnet_address_space           = string
    secondary_address_space             = string
    secondary_apps_subnet_address_space = string
    secondary_subnet_address_space      = string
  })
}
