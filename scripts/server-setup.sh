#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Hetzner VPS initial setup for CRM deployment
# Run as root on a fresh Ubuntu 24.04 server
# Usage: curl ... | bash  OR  ssh root@server < server-setup.sh
# ============================================================

DEPLOY_USER="deploy"

echo "==> Updating system packages"
apt-get update && apt-get upgrade -y

echo "==> Installing essentials"
apt-get install -y \
  curl \
  gnupg \
  ufw \
  fail2ban \
  unattended-upgrades \
  apt-listchanges

# --- Docker ---
echo "==> Installing Docker"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# --- Deploy user ---
echo "==> Creating deploy user"
if ! id "$DEPLOY_USER" &>/dev/null; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"

# Copy SSH keys from root to deploy user
mkdir -p /home/$DEPLOY_USER/.ssh
cp /root/.ssh/authorized_keys /home/$DEPLOY_USER/.ssh/authorized_keys
chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
chmod 700 /home/$DEPLOY_USER/.ssh
chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys

# --- SSH hardening ---
echo "==> Hardening SSH"
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
systemctl restart sshd

# --- Firewall (ufw) ---
# Only allow SSH + HTTP/HTTPS from Cloudflare IPs
echo "==> Configuring firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment "SSH"

# Cloudflare IPv4 ranges
for ip in \
  173.245.48.0/20 \
  103.21.244.0/22 \
  103.22.200.0/22 \
  103.31.4.0/22 \
  141.101.64.0/18 \
  108.162.192.0/18 \
  190.93.240.0/20 \
  188.114.96.0/20 \
  197.234.240.0/22 \
  198.41.128.0/17 \
  162.158.0.0/15 \
  104.16.0.0/13 \
  104.24.0.0/14 \
  172.64.0.0/13 \
  131.0.72.0/22; do
  ufw allow from "$ip" to any port 80,443 proto tcp comment "Cloudflare"
done

# Cloudflare IPv6 ranges
for ip in \
  2400:cb00::/32 \
  2606:4700::/32 \
  2803:f800::/32 \
  2405:b500::/32 \
  2405:8100::/32 \
  2a06:98c0::/29 \
  2c0f:f248::/32; do
  ufw allow from "$ip" to any port 80,443 proto tcp comment "Cloudflare IPv6"
done

ufw --force enable

# --- Fail2ban ---
echo "==> Configuring fail2ban"
cat > /etc/fail2ban/jail.local <<'JAIL'
[sshd]
enabled = true
port = ssh
maxretry = 5
bantime = 3600
findtime = 600
JAIL
systemctl enable fail2ban
systemctl restart fail2ban

# --- Unattended upgrades ---
echo "==> Enabling automatic security updates"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'AUTO'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
AUTO

# --- App directory ---
echo "==> Setting up application directory"
mkdir -p /home/$DEPLOY_USER/crm/certs
mkdir -p /home/$DEPLOY_USER/crm/backups
chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/crm

echo ""
echo "============================================"
echo "  Server setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Add your SSH public key to /home/$DEPLOY_USER/.ssh/authorized_keys"
echo "  2. Generate Cloudflare Origin CA cert for crm.ssikira.com"
echo "     and place origin.pem + origin-key.pem in ~/crm/certs/"
echo "  3. Copy .env and firebase-service-account.json to ~/crm/"
echo "  4. Log in as '$DEPLOY_USER' (root login is now disabled)"
echo ""
