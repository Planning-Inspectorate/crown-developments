# common variables loaded by default
# see https://developer.hashicorp.com/terraform/language/values/variables#variable-definitions-tfvars-files

tooling_config = {
  container_registry_name = "pinscrsharedtoolinguks"
  container_registry_rg   = "pins-rg-shared-tooling-uks"
  network_name            = "pins-vnet-shared-tooling-uks"
  network_rg              = "pins-rg-shared-tooling-uks"
  subscription_id         = "edb1ff78-90da-4901-a497-7e79f966f8e2"
}
