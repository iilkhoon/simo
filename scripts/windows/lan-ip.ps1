# Kompüterin Wi-Fi / LAN IPv4 ünvanı (telefon bu ünvanla backend-ə qoşulur).
# Docker / WSL / VPN virtual adapterləri deyil, internetə çıxan (gateway-i olan) adapter seçilir.
$cfg = Get-NetIPConfiguration |
  Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' -and $_.InterfaceAlias -notmatch 'vEthernet|WSL|Docker|VirtualBox|VMware|Hyper-V' } |
  Select-Object -First 1
if ($cfg) { $cfg.IPv4Address[0].IPAddress } else { '127.0.0.1' }
