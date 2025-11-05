module "security_tags" {
  for_each = local.resource_tags

  source     = "github.com/Planning-Inspectorate/infrastructure-modules.git//modules/resource-tags?ref=688070b6af6af2f2a5c745bab5519f82307dc889"
  base_tags  = local.tags
  extra_tags = each.value
}

locals {
  resource_tags = {
    manage = {
      CriticalityRating = "Level 100"
      PersonalData      = "Yes"
    }
    sql = {
      CriticalityRating = "Level 3"
      PersonalData      = "No"
    }
    portal = {
      CriticalityRating = "Level 2"
      PersonalData      = "Yes"
    }
    monitoring = {
      CriticalityRating = "Level 99"
      PersonalData      = "No"
    }
  }
}
