module "security_tags" {
  for_each = local.resource_tags

  source     = "github.com/Planning-Inspectorate/infrastructure-modules.git//modules/resource-tags?ref=688070b6af6af2f2a5c745bab5519f82307dc889"
  base_tags  = local.tags
  extra_tags = each.value
}
