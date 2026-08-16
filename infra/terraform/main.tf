terraform {
  required_version = ">= 1.15.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}

  subscription_id = var.subscription_id
}

resource "azurerm_resource_group" "circlechat" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_service_plan" "circlechat" {
  name                = "circlechat-app-plan"
  resource_group_name = azurerm_resource_group.circlechat.name
  location            = azurerm_resource_group.circlechat.location
  os_type             = "Linux"
  sku_name            = "B1"
}

resource "azurerm_linux_web_app" "circlechat" {
  name                = var.app_name
  resource_group_name = azurerm_resource_group.circlechat.name
  location            = azurerm_resource_group.circlechat.location
  service_plan_id     = azurerm_service_plan.circlechat.id

  site_config {
    always_on           = false
    websockets_enabled  = false
    use_32_bit_worker   = true
    minimum_tls_version = "1.2"

    application_stack {
      docker_image_name = "${var.docker_image}:latest"
    }
  }

  app_settings = {
    WEBSITES_PORT = var.container_port
  }

  lifecycle {
    ignore_changes = [
      app_settings,
      site_config[0].application_stack[0].docker_registry_url,
      site_config[0].application_stack[0].docker_registry_username,
      site_config[0].application_stack[0].docker_registry_password,
      site_config[0].application_stack[0].docker_image_name,
    ]
  }
}