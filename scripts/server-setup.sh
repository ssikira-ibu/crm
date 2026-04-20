#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Hetzner VPS initial setup for CRM deployment
# Run as root on a fresh Ubuntu 24.04 server
# (Or use cloud-init.yml for automated provisioning)
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

# --- Firewall — SSH only, web traffic goes through Cloudflare Tunnel ---
echo "==> Configuring firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment "SSH"
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
mkdir -p /home/$DEPLOY_USER/crm/backups
chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/crm

echo ""
echo "============================================"
echo "  Server setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Create a Cloudflare Tunnel in Zero Trust dashboard"
echo "  2. Copy .env and firebase-service-account.json to ~/crm/"
echo "  3. Log in as '$DEPLOY_USER' (root login is now disabled)"
echo ""
