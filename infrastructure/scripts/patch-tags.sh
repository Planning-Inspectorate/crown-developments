#!/bin/bash
set -e

echo "=== Patching App Service Tags ==="

# Get resource IDs and tag values from Terraform outputs
cd infrastructure

echo "Getting Terraform outputs..."
APP_MANAGE_ID=$(terraform output -raw app_manage_id 2>/dev/null || echo "")
APP_PORTAL_ID=$(terraform output -raw app_portal_id 2>/dev/null || echo "")

if [ -z "$APP_MANAGE_ID" ] || [ -z "$APP_PORTAL_ID" ]; then
    echo "Error: Could not get resource IDs from Terraform outputs"
    exit 1
fi

echo "App Manage ID: $APP_MANAGE_ID"
echo "App Portal ID: $APP_PORTAL_ID"

# Patch manage app tags
echo "Updating manage app tags..."
az resource update --ids "$APP_MANAGE_ID" --set \
    tags.CriticalityRating="Level 100" \
    tags.PersonalData="Yes" \
    tags.CreatedBy="devops"

# Patch portal app tags  
echo "Updating portal app tags..."
az resource update --ids "$APP_PORTAL_ID" --set \
    tags.CriticalityRating="Level 2" \
    tags.PersonalData="Yes" \
    tags.CreatedBy="devops"

echo "=== Tag patching complete ==="

# Verify the changes
echo "=== Verifying tags ==="
echo "Manage app tags:"
az resource show --ids "$APP_MANAGE_ID" --query tags --output table

echo "Portal app tags:"
az resource show --ids "$APP_PORTAL_ID" --query tags --output table