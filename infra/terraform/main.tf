resource "azurerm_resource_group" "circlechat" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_virtual_network" "circlechat" {
  name                = "circlechat-vm-vnet"
  location            = azurerm_resource_group.circlechat.location
  resource_group_name = "rg-circlechat-k3s"
  address_space       = ["10.1.0.0/16"]
}

resource "azurerm_subnet" "circlechat" {
  name                 = "default"
  resource_group_name  = "rg-circlechat-k3s"
  virtual_network_name = azurerm_virtual_network.circlechat.name
  address_prefixes     = ["10.1.1.0/24"]
}

resource "azurerm_network_security_group" "circlechat" {
  name                = "circlechat-vm-nsg"
  location            = azurerm_resource_group.circlechat.location
  resource_group_name = "rg-circlechat-k3s"
}

resource "azurerm_network_security_rule" "ssh" {
  name                        = "SSH"
  priority                    = 300
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "22"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = "rg-circlechat-k3s"
  network_security_group_name = azurerm_network_security_group.circlechat.name
}

resource "azurerm_network_security_rule" "nodeport" {
  name                        = "allow-circlechat-nodeport"
  priority                    = 310
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "31524"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = "rg-circlechat-k3s"
  network_security_group_name = azurerm_network_security_group.circlechat.name
}

resource "azurerm_network_security_rule" "http" {
  name                        = "allow-http"
  priority                    = 320
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "80"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = "rg-circlechat-k3s"
  network_security_group_name = azurerm_network_security_group.circlechat.name
}

resource "azurerm_network_security_rule" "https" {
  name                        = "allow-https"
  priority                    = 330
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = "rg-circlechat-k3s"
  network_security_group_name = azurerm_network_security_group.circlechat.name
}

resource "azurerm_public_ip" "circlechat" {
  name                = "circlechat-vm-ip"
  location            = azurerm_resource_group.circlechat.location
  resource_group_name = "rg-circlechat-k3s"
  allocation_method   = "Static"
}

resource "azurerm_network_interface" "circlechat" {
  name                = "circlechat-vm132"
  location            = azurerm_resource_group.circlechat.location
  resource_group_name = "rg-circlechat-k3s"

  ip_configuration {
    name                          = "ipconfig1"
    subnet_id                     = azurerm_subnet.circlechat.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.circlechat.id
  }
}

resource "azurerm_network_interface_security_group_association" "circlechat" {
  network_interface_id      = azurerm_network_interface.circlechat.id
  network_security_group_id = azurerm_network_security_group.circlechat.id
}

resource "azurerm_linux_virtual_machine" "circlechat" {
  name                = "circlechat-vm"
  resource_group_name = "RG-CIRCLECHAT-K3S"
  location            = azurerm_resource_group.circlechat.location
  size                = "Standard_B2ats_v2"
  admin_username      = "rachit"

  network_interface_ids = [
    azurerm_network_interface.circlechat.id
  ]

  disable_password_authentication = true

  admin_ssh_key {
    username   = "rachit"
    public_key = var.ssh_public_key
  }

  os_disk {
    name                 = "circlechat-vm_OsDisk_1_31a7a2bcdd794a5bbe821fcdedbb1b75"
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 64
  }

  source_image_reference {
    publisher = "canonical"
    offer     = "ubuntu-22_04-lts"
    sku       = "server"
    version   = "latest"
  }

  lifecycle {
    ignore_changes = [
      admin_ssh_key
    ]
  }
}