# Resource IDs for external tag management
output "app_manage_id" {
  description = "App Service resource ID for manage app"
  value       = module.app_manage.id
}

output "app_portal_id" {
  description = "App Service resource ID for portal app"
  value       = module.app_portal.id
}

# Tag values for CLI patching
output "app_manage_tags" {
  description = "Computed tags for manage app"
  value       = module.security_tags["manage"].tags
  sensitive   = true
}

output "app_portal_tags" {
  description = "Computed tags for portal app"
  value       = module.security_tags["portal"].tags
  sensitive   = true
}
