import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { SignJWT } from "jose";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5432/test";
const apiUrl = process.env.API_URL ?? "http://localhost:3000";
const s2sSecret = process.env.S2S_JWT_SECRET;

if (!s2sSecret) {
  console.error("S2S_JWT_SECRET env var is required");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Seed constants — override with env vars to seed for a real user
// ---------------------------------------------------------------------------

const SEED_USER_ID = process.env.SEED_USER_ID ?? "seed-user-firebase-uid";
const SEED_USER_EMAIL = process.env.SEED_USER_EMAIL ?? "seed@example.com";
const SEED_USER_NAME = process.env.SEED_USER_NAME ?? "Seed User";

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------

const encodedKey = new TextEncoder().encode(s2sSecret);

async function createToken(): Promise<string> {
  return new SignJWT({ uid: SEED_USER_ID, email: SEED_USER_EMAIL })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(encodedKey);
}

async function api<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await createToken();
  const res = await fetch(`${apiUrl}/api${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${path} failed (${res.status}): ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as T;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const COMPANIES = [
  { name: "TechNova Solutions", industry: "Technology", website: "https://technova.example.com", phone: "+1-555-100-2000", email: "info@technova.example.com", status: "ACTIVE" as const },
  { name: "GreenLeaf Industries", industry: "Manufacturing", website: "https://greenleaf.example.com", phone: "+1-555-200-3000", email: "hello@greenleaf.example.com", status: "ACTIVE" as const },
  { name: "Pinnacle Consulting", industry: "Consulting", website: "https://pinnacle.example.com", phone: "+1-555-300-4000", email: "contact@pinnacle.example.com", status: "PROSPECT" as const },
  { name: "Orion Financial Group", industry: "Financial Services", website: "https://orionfinancial.example.com", phone: "+1-555-400-5000", email: "info@orionfinancial.example.com", status: "ACTIVE" as const },
  { name: "Atlas Logistics", industry: "Transportation & Logistics", website: "https://atlaslogistics.example.com", phone: "+1-555-500-6000", email: "sales@atlaslogistics.example.com", status: "ACTIVE" as const },
  { name: "Meridian Healthcare", industry: "Healthcare", website: "https://meridianhc.example.com", phone: "+1-555-600-7000", email: "partnerships@meridianhc.example.com", status: "PROSPECT" as const },
  { name: "Cobalt Media", industry: "Media & Entertainment", website: "https://cobaltmedia.example.com", phone: "+1-555-700-8000", email: "biz@cobaltmedia.example.com", status: "ACTIVE" as const },
  { name: "Summit Education", industry: "Education", website: "https://summitedu.example.com", phone: "+1-555-800-9000", email: "info@summitedu.example.com", status: "LEAD" as const },
  { name: "Vanguard Robotics", industry: "Technology", website: "https://vanguardrobotics.example.com", phone: "+1-555-900-1000", email: "contact@vanguardrobotics.example.com", status: "PROSPECT" as const },
  { name: "Redwood Real Estate", industry: "Real Estate", website: "https://redwoodre.example.com", phone: "+1-555-110-2200", email: "leasing@redwoodre.example.com", status: "ACTIVE" as const },
  { name: "Horizon Energy", industry: "Energy & Utilities", website: "https://horizonenergy.example.com", phone: "+1-555-120-3300", email: "enterprise@horizonenergy.example.com", status: "ACTIVE" as const },
  { name: "BlueSky Airlines", industry: "Transportation & Logistics", website: "https://blueskyair.example.com", phone: "+1-555-130-4400", email: "corporate@blueskyair.example.com", status: "LEAD" as const },
  { name: "Northstar Insurance", industry: "Financial Services", website: "https://northstarins.example.com", phone: "+1-555-140-5500", email: "agents@northstarins.example.com", status: "PROSPECT" as const },
  { name: "Forge Manufacturing", industry: "Manufacturing", website: "https://forgemfg.example.com", phone: "+1-555-150-6600", email: "procurement@forgemfg.example.com", status: "ACTIVE" as const },
  { name: "Ember Creative", industry: "Media & Entertainment", website: "https://embercreative.example.com", phone: "+1-555-160-7700", email: "hello@embercreative.example.com", status: "LEAD" as const },
  { name: "Quantum Analytics", industry: "Technology", website: "https://quantumanalytics.example.com", phone: "+1-555-170-8800", email: "demo@quantumanalytics.example.com", status: "INACTIVE" as const },
  { name: "Pacific Foods Co", industry: "Food & Beverage", website: "https://pacificfoods.example.com", phone: "+1-555-180-9900", email: "wholesale@pacificfoods.example.com", status: "ACTIVE" as const },
  { name: "Silverline Pharma", industry: "Healthcare", website: "https://silverlinepharma.example.com", phone: "+1-555-190-1100", email: "bd@silverlinepharma.example.com", status: "PROSPECT" as const },
  { name: "Apex Sports Group", industry: "Sports & Recreation", website: "https://apexsports.example.com", phone: "+1-555-210-2200", email: "sponsors@apexsports.example.com", status: "LEAD" as const },
  { name: "Cascade Software", industry: "Technology", website: "https://cascadesw.example.com", phone: "+1-555-220-3300", email: "partnerships@cascadesw.example.com", status: "ACTIVE" as const },
];

const CONTACTS_PER_COMPANY: Record<string, Array<{ firstName: string; lastName: string; email: string; jobTitle: string; isPrimary?: boolean }>> = {
  "TechNova Solutions": [
    { firstName: "Alice", lastName: "Johnson", email: "alice@technova.example.com", jobTitle: "VP of Engineering", isPrimary: true },
    { firstName: "Bob", lastName: "Smith", email: "bob@technova.example.com", jobTitle: "CTO" },
    { firstName: "Rachel", lastName: "Kim", email: "rachel@technova.example.com", jobTitle: "Head of Product" },
  ],
  "GreenLeaf Industries": [
    { firstName: "Carol", lastName: "Williams", email: "carol@greenleaf.example.com", jobTitle: "Procurement Manager", isPrimary: true },
    { firstName: "Marcus", lastName: "Chen", email: "marcus@greenleaf.example.com", jobTitle: "Operations Director" },
  ],
  "Pinnacle Consulting": [
    { firstName: "David", lastName: "Brown", email: "david@pinnacle.example.com", jobTitle: "Managing Partner", isPrimary: true },
    { firstName: "Sophia", lastName: "Martinez", email: "sophia@pinnacle.example.com", jobTitle: "Senior Consultant" },
  ],
  "Orion Financial Group": [
    { firstName: "James", lastName: "Wilson", email: "james@orionfinancial.example.com", jobTitle: "CFO", isPrimary: true },
    { firstName: "Olivia", lastName: "Taylor", email: "olivia@orionfinancial.example.com", jobTitle: "VP of Operations" },
    { firstName: "Ethan", lastName: "Davis", email: "ethan@orionfinancial.example.com", jobTitle: "Head of IT" },
  ],
  "Atlas Logistics": [
    { firstName: "Liam", lastName: "Anderson", email: "liam@atlaslogistics.example.com", jobTitle: "CEO", isPrimary: true },
    { firstName: "Mia", lastName: "Thomas", email: "mia@atlaslogistics.example.com", jobTitle: "VP Supply Chain" },
  ],
  "Meridian Healthcare": [
    { firstName: "Noah", lastName: "Jackson", email: "noah@meridianhc.example.com", jobTitle: "Chief Medical Officer", isPrimary: true },
    { firstName: "Emma", lastName: "White", email: "emma@meridianhc.example.com", jobTitle: "Director of Partnerships" },
    { firstName: "Ava", lastName: "Harris", email: "ava@meridianhc.example.com", jobTitle: "IT Manager" },
  ],
  "Cobalt Media": [
    { firstName: "Lucas", lastName: "Martin", email: "lucas@cobaltmedia.example.com", jobTitle: "Creative Director", isPrimary: true },
    { firstName: "Isabella", lastName: "Garcia", email: "isabella@cobaltmedia.example.com", jobTitle: "Head of Sales" },
  ],
  "Summit Education": [
    { firstName: "Mason", lastName: "Rodriguez", email: "mason@summitedu.example.com", jobTitle: "Dean of Programs", isPrimary: true },
    { firstName: "Charlotte", lastName: "Lee", email: "charlotte@summitedu.example.com", jobTitle: "Director of Technology" },
  ],
  "Vanguard Robotics": [
    { firstName: "Logan", lastName: "Walker", email: "logan@vanguardrobotics.example.com", jobTitle: "Founder & CEO", isPrimary: true },
    { firstName: "Amelia", lastName: "Hall", email: "amelia@vanguardrobotics.example.com", jobTitle: "VP of Sales" },
    { firstName: "Benjamin", lastName: "Allen", email: "benjamin@vanguardrobotics.example.com", jobTitle: "Head of Engineering" },
  ],
  "Redwood Real Estate": [
    { firstName: "Harper", lastName: "Young", email: "harper@redwoodre.example.com", jobTitle: "Managing Director", isPrimary: true },
    { firstName: "Alexander", lastName: "King", email: "alexander@redwoodre.example.com", jobTitle: "VP of Commercial Leasing" },
  ],
  "Horizon Energy": [
    { firstName: "Daniel", lastName: "Wright", email: "daniel@horizonenergy.example.com", jobTitle: "Director of Enterprise Sales", isPrimary: true },
    { firstName: "Scarlett", lastName: "Lopez", email: "scarlett@horizonenergy.example.com", jobTitle: "Sustainability Lead" },
  ],
  "BlueSky Airlines": [
    { firstName: "Henry", lastName: "Hill", email: "henry@blueskyair.example.com", jobTitle: "VP of Corporate Accounts", isPrimary: true },
  ],
  "Northstar Insurance": [
    { firstName: "Grace", lastName: "Scott", email: "grace@northstarins.example.com", jobTitle: "Regional Director", isPrimary: true },
    { firstName: "Jack", lastName: "Green", email: "jack@northstarins.example.com", jobTitle: "Underwriting Manager" },
  ],
  "Forge Manufacturing": [
    { firstName: "Sebastian", lastName: "Adams", email: "sebastian@forgemfg.example.com", jobTitle: "Plant Manager", isPrimary: true },
    { firstName: "Aria", lastName: "Baker", email: "aria@forgemfg.example.com", jobTitle: "Quality Assurance Director" },
    { firstName: "Owen", lastName: "Nelson", email: "owen@forgemfg.example.com", jobTitle: "Procurement Lead" },
  ],
  "Ember Creative": [
    { firstName: "Chloe", lastName: "Carter", email: "chloe@embercreative.example.com", jobTitle: "Founder", isPrimary: true },
  ],
  "Quantum Analytics": [
    { firstName: "Elijah", lastName: "Mitchell", email: "elijah@quantumanalytics.example.com", jobTitle: "CTO", isPrimary: true },
    { firstName: "Lily", lastName: "Perez", email: "lily@quantumanalytics.example.com", jobTitle: "Data Science Lead" },
  ],
  "Pacific Foods Co": [
    { firstName: "Matthew", lastName: "Roberts", email: "matthew@pacificfoods.example.com", jobTitle: "VP of Sales", isPrimary: true },
    { firstName: "Zoey", lastName: "Turner", email: "zoey@pacificfoods.example.com", jobTitle: "Account Manager" },
  ],
  "Silverline Pharma": [
    { firstName: "Samuel", lastName: "Phillips", email: "samuel@silverlinepharma.example.com", jobTitle: "Head of Business Development", isPrimary: true },
    { firstName: "Penelope", lastName: "Campbell", email: "penelope@silverlinepharma.example.com", jobTitle: "Clinical Partnerships Manager" },
  ],
  "Apex Sports Group": [
    { firstName: "Nathan", lastName: "Parker", email: "nathan@apexsports.example.com", jobTitle: "Director of Sponsorships", isPrimary: true },
  ],
  "Cascade Software": [
    { firstName: "Victoria", lastName: "Evans", email: "victoria@cascadesw.example.com", jobTitle: "CEO", isPrimary: true },
    { firstName: "Dylan", lastName: "Edwards", email: "dylan@cascadesw.example.com", jobTitle: "VP of Partnerships" },
    { firstName: "Hannah", lastName: "Collins", email: "hannah@cascadesw.example.com", jobTitle: "Product Manager" },
  ],
};

const TAGS = [
  { name: "Enterprise", color: "#3B82F6" },
  { name: "Startup", color: "#10B981" },
  { name: "High Value", color: "#F59E0B" },
  { name: "Strategic", color: "#8B5CF6" },
  { name: "At Risk", color: "#EF4444" },
  { name: "Expansion", color: "#06B6D4" },
  { name: "Referral", color: "#EC4899" },
  { name: "Government", color: "#6B7280" },
];

const TAG_ASSIGNMENTS: Record<string, string[]> = {
  "TechNova Solutions": ["Enterprise", "High Value", "Strategic"],
  "GreenLeaf Industries": ["Expansion"],
  "Pinnacle Consulting": ["Referral"],
  "Orion Financial Group": ["Enterprise", "High Value"],
  "Atlas Logistics": ["Enterprise", "Expansion"],
  "Meridian Healthcare": ["Enterprise", "Strategic"],
  "Cobalt Media": ["Startup", "High Value"],
  "Summit Education": ["Referral"],
  "Vanguard Robotics": ["Startup", "Strategic"],
  "Redwood Real Estate": ["Enterprise"],
  "Horizon Energy": ["Enterprise", "High Value", "Strategic"],
  "BlueSky Airlines": ["Enterprise"],
  "Northstar Insurance": ["Enterprise", "At Risk"],
  "Forge Manufacturing": ["Enterprise", "Expansion"],
  "Ember Creative": ["Startup", "Referral"],
  "Quantum Analytics": ["At Risk"],
  "Pacific Foods Co": ["Expansion"],
  "Silverline Pharma": ["Enterprise", "Strategic"],
  "Apex Sports Group": ["Referral"],
  "Cascade Software": ["Strategic", "High Value"],
};

interface DealDef {
  company: string;
  contactFirst: string;
  title: string;
  description: string;
  value: number;
  stage: string;
  expectedCloseDate?: string;
}

const DEALS: DealDef[] = [
  { company: "TechNova Solutions", contactFirst: "Alice", title: "TechNova Platform License", description: "Annual enterprise license for the full platform suite", value: 120000, stage: "Proposal", expectedCloseDate: "2026-07-15" },
  { company: "TechNova Solutions", contactFirst: "Bob", title: "TechNova Support Contract", description: "24/7 premium support package", value: 36000, stage: "Won" },
  { company: "TechNova Solutions", contactFirst: "Rachel", title: "TechNova API Integration", description: "Custom API integration for their internal tools", value: 85000, stage: "Negotiation", expectedCloseDate: "2026-06-30" },
  { company: "GreenLeaf Industries", contactFirst: "Carol", title: "GreenLeaf Supply Chain Module", description: "Integration of supply chain management module", value: 45000, stage: "Qualified", expectedCloseDate: "2026-08-30" },
  { company: "GreenLeaf Industries", contactFirst: "Marcus", title: "GreenLeaf Warehouse Automation", description: "Warehouse management system deployment", value: 78000, stage: "Lead In", expectedCloseDate: "2026-10-15" },
  { company: "Pinnacle Consulting", contactFirst: "David", title: "Pinnacle Advisory Retainer", description: "Monthly consulting retainer agreement", value: 15000, stage: "Lead In", expectedCloseDate: "2026-09-15" },
  { company: "Orion Financial Group", contactFirst: "James", title: "Orion Risk Platform", description: "Enterprise risk management platform deployment", value: 250000, stage: "Proposal", expectedCloseDate: "2026-08-01" },
  { company: "Orion Financial Group", contactFirst: "Ethan", title: "Orion Data Migration", description: "Legacy system data migration to cloud", value: 95000, stage: "Negotiation", expectedCloseDate: "2026-07-01" },
  { company: "Atlas Logistics", contactFirst: "Liam", title: "Atlas Fleet Tracking", description: "Real-time fleet tracking and optimization platform", value: 180000, stage: "Won" },
  { company: "Atlas Logistics", contactFirst: "Mia", title: "Atlas Route Optimization", description: "AI-powered route optimization add-on", value: 65000, stage: "Qualified", expectedCloseDate: "2026-09-01" },
  { company: "Meridian Healthcare", contactFirst: "Noah", title: "Meridian Patient Portal", description: "Patient engagement portal development", value: 320000, stage: "Proposal", expectedCloseDate: "2026-09-30" },
  { company: "Meridian Healthcare", contactFirst: "Emma", title: "Meridian HIPAA Compliance Audit", description: "Compliance assessment and remediation", value: 45000, stage: "Won" },
  { company: "Cobalt Media", contactFirst: "Isabella", title: "Cobalt Ad Platform License", description: "Programmatic advertising platform license", value: 92000, stage: "Negotiation", expectedCloseDate: "2026-06-15" },
  { company: "Summit Education", contactFirst: "Mason", title: "Summit LMS Platform", description: "Learning management system for online courses", value: 55000, stage: "Lead In", expectedCloseDate: "2026-11-01" },
  { company: "Vanguard Robotics", contactFirst: "Logan", title: "Vanguard IoT Dashboard", description: "Real-time IoT monitoring dashboard", value: 140000, stage: "Qualified", expectedCloseDate: "2026-08-15" },
  { company: "Vanguard Robotics", contactFirst: "Amelia", title: "Vanguard Predictive Maintenance", description: "ML-based predictive maintenance system", value: 210000, stage: "Lead In", expectedCloseDate: "2026-12-01" },
  { company: "Redwood Real Estate", contactFirst: "Harper", title: "Redwood Property Management SaaS", description: "Cloud-based property management platform", value: 72000, stage: "Won" },
  { company: "Horizon Energy", contactFirst: "Daniel", title: "Horizon Grid Analytics", description: "Smart grid analytics and reporting platform", value: 280000, stage: "Proposal", expectedCloseDate: "2026-08-20" },
  { company: "Horizon Energy", contactFirst: "Scarlett", title: "Horizon Carbon Tracking", description: "Carbon emissions tracking and reporting tool", value: 48000, stage: "Qualified", expectedCloseDate: "2026-09-15" },
  { company: "Northstar Insurance", contactFirst: "Grace", title: "Northstar Claims Automation", description: "AI-driven claims processing automation", value: 165000, stage: "Lost" },
  { company: "Forge Manufacturing", contactFirst: "Sebastian", title: "Forge ERP Integration", description: "ERP system integration with existing tools", value: 110000, stage: "Negotiation", expectedCloseDate: "2026-07-20" },
  { company: "Forge Manufacturing", contactFirst: "Owen", title: "Forge Inventory System", description: "Real-time inventory tracking system", value: 58000, stage: "Won" },
  { company: "Cascade Software", contactFirst: "Victoria", title: "Cascade White-Label Platform", description: "White-label SaaS platform partnership", value: 350000, stage: "Proposal", expectedCloseDate: "2026-08-30" },
  { company: "Cascade Software", contactFirst: "Dylan", title: "Cascade Integration Marketplace", description: "Joint integration marketplace development", value: 125000, stage: "Qualified", expectedCloseDate: "2026-10-01" },
  { company: "Pacific Foods Co", contactFirst: "Matthew", title: "Pacific Distribution Platform", description: "Distribution network management platform", value: 88000, stage: "Negotiation", expectedCloseDate: "2026-07-10" },
  { company: "Silverline Pharma", contactFirst: "Samuel", title: "Silverline Trial Management", description: "Clinical trial management system", value: 420000, stage: "Lead In", expectedCloseDate: "2026-12-15" },
];

interface ActivityDef {
  company: string;
  contactFirst?: string;
  type: "MEETING" | "CALL" | "EMAIL" | "OTHER";
  title: string;
  description: string;
  date: string;
  deal?: string;
}

const ACTIVITIES: ActivityDef[] = [
  { company: "TechNova Solutions", contactFirst: "Alice", type: "MEETING", title: "Platform demo with TechNova", description: "Presented full platform capabilities to the engineering team", date: "2026-03-15", deal: "TechNova Platform License" },
  { company: "TechNova Solutions", contactFirst: "Bob", type: "CALL", title: "Technical deep-dive with CTO", description: "Discussed architecture, scalability, and security requirements", date: "2026-03-22", deal: "TechNova Platform License" },
  { company: "TechNova Solutions", contactFirst: "Alice", type: "EMAIL", title: "Sent pricing proposal", description: "Emailed detailed pricing breakdown with volume discounts", date: "2026-04-01", deal: "TechNova Platform License" },
  { company: "TechNova Solutions", contactFirst: "Rachel", type: "MEETING", title: "Product roadmap alignment", description: "Discussed product roadmap and feature priorities with head of product", date: "2026-04-10", deal: "TechNova API Integration" },
  { company: "TechNova Solutions", contactFirst: "Bob", type: "CALL", title: "Support contract renewal call", description: "Reviewed SLA metrics and discussed contract extension", date: "2026-04-18" },
  { company: "GreenLeaf Industries", contactFirst: "Carol", type: "MEETING", title: "Initial discovery meeting", description: "Understood procurement process and pain points", date: "2026-03-10", deal: "GreenLeaf Supply Chain Module" },
  { company: "GreenLeaf Industries", contactFirst: "Marcus", type: "CALL", title: "Operations requirements call", description: "Detailed requirements gathering for warehouse operations", date: "2026-03-25", deal: "GreenLeaf Warehouse Automation" },
  { company: "GreenLeaf Industries", contactFirst: "Carol", type: "EMAIL", title: "Sent capabilities overview", description: "Shared product capabilities document and case studies", date: "2026-04-02", deal: "GreenLeaf Supply Chain Module" },
  { company: "Pinnacle Consulting", contactFirst: "David", type: "MEETING", title: "Intro meeting with Pinnacle", description: "Initial discovery meeting with managing partner", date: "2026-04-05" },
  { company: "Pinnacle Consulting", contactFirst: "Sophia", type: "CALL", title: "Use case discussion", description: "Explored consulting workflow automation opportunities", date: "2026-04-15" },
  { company: "Orion Financial Group", contactFirst: "James", type: "MEETING", title: "Executive presentation", description: "Presented risk management platform to C-suite", date: "2026-03-05", deal: "Orion Risk Platform" },
  { company: "Orion Financial Group", contactFirst: "Ethan", type: "CALL", title: "Technical assessment call", description: "IT team evaluated integration requirements and data migration path", date: "2026-03-18", deal: "Orion Data Migration" },
  { company: "Orion Financial Group", contactFirst: "James", type: "MEETING", title: "Proposal review meeting", description: "Walked through proposal, addressed budget concerns", date: "2026-04-08", deal: "Orion Risk Platform" },
  { company: "Orion Financial Group", contactFirst: "Olivia", type: "EMAIL", title: "ROI analysis sent", description: "Delivered detailed ROI analysis with 3-year projections", date: "2026-04-20", deal: "Orion Risk Platform" },
  { company: "Atlas Logistics", contactFirst: "Liam", type: "MEETING", title: "Fleet tracking kickoff", description: "Project kickoff meeting for fleet tracking deployment", date: "2026-02-15", deal: "Atlas Fleet Tracking" },
  { company: "Atlas Logistics", contactFirst: "Mia", type: "CALL", title: "Route optimization demo", description: "Demonstrated AI route optimization with their actual data", date: "2026-04-01", deal: "Atlas Route Optimization" },
  { company: "Atlas Logistics", contactFirst: "Liam", type: "EMAIL", title: "Quarterly business review", description: "Shared Q1 performance metrics and platform usage stats", date: "2026-04-15" },
  { company: "Meridian Healthcare", contactFirst: "Noah", type: "MEETING", title: "Patient portal vision session", description: "Collaborative workshop on patient engagement strategy", date: "2026-03-20", deal: "Meridian Patient Portal" },
  { company: "Meridian Healthcare", contactFirst: "Emma", type: "CALL", title: "Partnerships discussion", description: "Explored broader partnership opportunities beyond current scope", date: "2026-04-05" },
  { company: "Meridian Healthcare", contactFirst: "Ava", type: "MEETING", title: "Security and compliance review", description: "Deep-dive into HIPAA compliance and security architecture", date: "2026-04-12", deal: "Meridian Patient Portal" },
  { company: "Cobalt Media", contactFirst: "Lucas", type: "MEETING", title: "Creative platform demo", description: "Showed ad creative management and analytics features", date: "2026-03-28", deal: "Cobalt Ad Platform License" },
  { company: "Cobalt Media", contactFirst: "Isabella", type: "CALL", title: "Pricing negotiation", description: "Discussed volume-based pricing and payment terms", date: "2026-04-18", deal: "Cobalt Ad Platform License" },
  { company: "Cobalt Media", contactFirst: "Isabella", type: "EMAIL", title: "Contract redline", description: "Sent updated contract with negotiated terms", date: "2026-04-25", deal: "Cobalt Ad Platform License" },
  { company: "Summit Education", contactFirst: "Mason", type: "MEETING", title: "LMS requirements workshop", description: "Gathered requirements for online course delivery platform", date: "2026-04-20", deal: "Summit LMS Platform" },
  { company: "Vanguard Robotics", contactFirst: "Logan", type: "MEETING", title: "IoT platform overview", description: "Presented IoT monitoring capabilities and architecture", date: "2026-03-12", deal: "Vanguard IoT Dashboard" },
  { company: "Vanguard Robotics", contactFirst: "Benjamin", type: "CALL", title: "Engineering deep-dive", description: "Technical discussion on sensor data ingestion and real-time processing", date: "2026-03-28", deal: "Vanguard IoT Dashboard" },
  { company: "Vanguard Robotics", contactFirst: "Amelia", type: "EMAIL", title: "Predictive maintenance proposal", description: "Sent initial scoping document for ML maintenance system", date: "2026-04-10", deal: "Vanguard Predictive Maintenance" },
  { company: "Redwood Real Estate", contactFirst: "Harper", type: "MEETING", title: "Implementation review", description: "Reviewed property management system rollout progress", date: "2026-04-22" },
  { company: "Redwood Real Estate", contactFirst: "Alexander", type: "CALL", title: "Expansion discussion", description: "Discussed adding commercial leasing module", date: "2026-05-01" },
  { company: "Horizon Energy", contactFirst: "Daniel", type: "MEETING", title: "Grid analytics presentation", description: "Presented smart grid analytics platform to decision team", date: "2026-03-15", deal: "Horizon Grid Analytics" },
  { company: "Horizon Energy", contactFirst: "Scarlett", type: "CALL", title: "Sustainability requirements", description: "Gathered carbon tracking and ESG reporting requirements", date: "2026-04-02", deal: "Horizon Carbon Tracking" },
  { company: "Horizon Energy", contactFirst: "Daniel", type: "EMAIL", title: "Proposal submitted", description: "Submitted comprehensive proposal with implementation timeline", date: "2026-04-20", deal: "Horizon Grid Analytics" },
  { company: "Northstar Insurance", contactFirst: "Grace", type: "MEETING", title: "Claims automation demo", description: "Demonstrated AI claims processing with sample policies", date: "2026-02-20", deal: "Northstar Claims Automation" },
  { company: "Northstar Insurance", contactFirst: "Jack", type: "CALL", title: "Underwriting integration call", description: "Discussed integration with existing underwriting systems", date: "2026-03-05", deal: "Northstar Claims Automation" },
  { company: "Northstar Insurance", contactFirst: "Grace", type: "EMAIL", title: "Deal lost follow-up", description: "Sent feedback request after they chose a competitor", date: "2026-04-30", deal: "Northstar Claims Automation" },
  { company: "Forge Manufacturing", contactFirst: "Sebastian", type: "MEETING", title: "ERP integration scoping", description: "Mapped out integration touchpoints with their existing ERP", date: "2026-03-08", deal: "Forge ERP Integration" },
  { company: "Forge Manufacturing", contactFirst: "Aria", type: "CALL", title: "QA process review", description: "Reviewed quality assurance workflow digitization needs", date: "2026-03-20" },
  { company: "Forge Manufacturing", contactFirst: "Owen", type: "MEETING", title: "Inventory system go-live", description: "Celebrated successful inventory system deployment", date: "2026-04-01", deal: "Forge Inventory System" },
  { company: "Cascade Software", contactFirst: "Victoria", type: "MEETING", title: "Partnership strategy session", description: "Explored white-label and co-selling partnership models", date: "2026-03-25", deal: "Cascade White-Label Platform" },
  { company: "Cascade Software", contactFirst: "Dylan", type: "CALL", title: "Integration marketplace planning", description: "Discussed marketplace architecture and revenue sharing", date: "2026-04-08", deal: "Cascade Integration Marketplace" },
  { company: "Cascade Software", contactFirst: "Hannah", type: "MEETING", title: "Product alignment session", description: "Aligned on product roadmap priorities for the partnership", date: "2026-04-22", deal: "Cascade White-Label Platform" },
  { company: "Pacific Foods Co", contactFirst: "Matthew", type: "MEETING", title: "Distribution platform demo", description: "Showed distribution management capabilities to sales team", date: "2026-03-18", deal: "Pacific Distribution Platform" },
  { company: "Pacific Foods Co", contactFirst: "Zoey", type: "CALL", title: "Account onboarding call", description: "Walked through implementation timeline and milestones", date: "2026-04-05", deal: "Pacific Distribution Platform" },
  { company: "Silverline Pharma", contactFirst: "Samuel", type: "MEETING", title: "Clinical trial platform intro", description: "Introduced trial management system capabilities", date: "2026-04-15", deal: "Silverline Trial Management" },
  { company: "Silverline Pharma", contactFirst: "Penelope", type: "CALL", title: "Regulatory compliance discussion", description: "Discussed FDA 21 CFR Part 11 compliance features", date: "2026-04-28", deal: "Silverline Trial Management" },
  { company: "Apex Sports Group", contactFirst: "Nathan", type: "MEETING", title: "Sponsorship platform demo", description: "Showed sponsorship management and ROI tracking features", date: "2026-04-25" },
];

interface NoteDef {
  company: string;
  contactFirst?: string;
  title: string;
  body: string;
}

const NOTES: NoteDef[] = [
  { company: "TechNova Solutions", contactFirst: "Alice", title: "Key requirements", body: "TechNova needs SSO integration and custom reporting. Alice is the primary decision-maker for the engineering budget. They need SOC2 compliance certification before signing." },
  { company: "TechNova Solutions", contactFirst: "Bob", title: "Technical blockers", body: "Bob raised concerns about API rate limits and data residency. They need EU data hosting option. Currently evaluating us against two competitors." },
  { company: "GreenLeaf Industries", title: "Competitor intel", body: "GreenLeaf is currently evaluating two other vendors. Our differentiator is the real-time tracking module. Decision expected by end of Q3." },
  { company: "GreenLeaf Industries", contactFirst: "Marcus", title: "Integration requirements", body: "Marcus needs integration with their SAP system. They run SAP S/4HANA on-premise. Will need custom connector development." },
  { company: "Pinnacle Consulting", contactFirst: "David", title: "Budget timeline", body: "Pinnacle fiscal year starts in October. David mentioned they allocate consulting budgets in Q3. Best to have proposal ready by August." },
  { company: "Orion Financial Group", contactFirst: "James", title: "Procurement process", body: "Orion has a 90-day procurement cycle. Need board approval for deals > $200k. James can approve up to $100k autonomously. Security review required." },
  { company: "Orion Financial Group", title: "Compliance requirements", body: "Must meet SOX compliance requirements. Need on-premise deployment option or FedRAMP certified cloud. Legal review will take 4-6 weeks." },
  { company: "Atlas Logistics", contactFirst: "Liam", title: "Expansion opportunity", body: "Liam hinted at expanding to 3 more distribution centers by Q4. Each center would need additional licenses. Potential upsell of $50-80k per center." },
  { company: "Meridian Healthcare", title: "HIPAA considerations", body: "All data must be encrypted at rest and in transit. BAA required before any data sharing. Need HITRUST certification or equivalent." },
  { company: "Meridian Healthcare", contactFirst: "Noah", title: "Decision timeline", body: "Noah has board presentation in September. Needs ROI case and reference customers in healthcare. Decision will be made at October board meeting." },
  { company: "Cobalt Media", contactFirst: "Isabella", title: "Budget constraints", body: "Cobalt is bootstrapped and cash-conscious. Isabella has authority up to $100k/year. Need to show clear ROI within 90 days of deployment." },
  { company: "Vanguard Robotics", contactFirst: "Logan", title: "Funding round impact", body: "Vanguard closing Series B in Q3. Budget will significantly expand after close. Logan wants to start small and scale post-funding." },
  { company: "Vanguard Robotics", title: "Technical architecture notes", body: "They run K8s on AWS. Need real-time data pipeline handling 10k events/sec from 500+ sensors. Current system is custom-built and hard to maintain." },
  { company: "Horizon Energy", contactFirst: "Daniel", title: "Regulatory landscape", body: "New DOE regulations require smart grid analytics by 2027. Horizon is ahead of compliance deadline but wants to be first mover. Strong urgency driver." },
  { company: "Northstar Insurance", contactFirst: "Grace", title: "Loss post-mortem", body: "Lost to InsureTech Pro. Key factors: they offered 40% lower price and had existing relationship. Grace said quality was better with us but couldn't justify the premium to board." },
  { company: "Forge Manufacturing", title: "Multi-site rollout plan", body: "Forge has 12 manufacturing sites. Current deal covers HQ + 2 largest plants. Successful deployment would lead to full rollout worth ~$500k total." },
  { company: "Cascade Software", contactFirst: "Victoria", title: "Partnership structure", body: "Victoria prefers revenue share over flat licensing. Proposed 70/30 split in their favor for first year, moving to 60/40. Need legal to draft partnership agreement." },
  { company: "Pacific Foods Co", title: "Seasonal considerations", body: "Pacific Foods has peak season Oct-Dec. Any implementation must be complete by September to avoid disrupting holiday operations. Tight timeline." },
  { company: "Silverline Pharma", contactFirst: "Samuel", title: "Trial complexity", body: "Silverline runs 30+ concurrent trials across 15 countries. Need multi-language support and country-specific regulatory compliance. Very complex but very high value." },
];

interface TaskDef {
  company?: string;
  contactFirst?: string;
  deal?: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  dueDate: string;
}

const TASKS: TaskDef[] = [
  { company: "TechNova Solutions", contactFirst: "Alice", deal: "TechNova Platform License", title: "Send revised proposal to Alice", description: "Update pricing based on feedback from the platform demo", status: "TODO", priority: "HIGH", dueDate: "2026-05-15" },
  { company: "TechNova Solutions", contactFirst: "Bob", deal: "TechNova API Integration", title: "Prepare API documentation package", description: "Compile API docs, SDKs, and sample code for Bob's team", status: "IN_PROGRESS", priority: "HIGH", dueDate: "2026-05-18" },
  { company: "TechNova Solutions", title: "Request SOC2 certification letter", description: "Get updated SOC2 Type II certification from compliance team", status: "TODO", priority: "NORMAL", dueDate: "2026-05-20" },
  { company: "GreenLeaf Industries", contactFirst: "Carol", deal: "GreenLeaf Supply Chain Module", title: "Schedule technical review with GreenLeaf", description: "Set up a call to walk through integration architecture", status: "IN_PROGRESS", priority: "NORMAL", dueDate: "2026-05-20" },
  { company: "GreenLeaf Industries", title: "Prepare SAP connector estimate", description: "Get engineering estimate for custom SAP S/4HANA connector", status: "TODO", priority: "HIGH", dueDate: "2026-05-25" },
  { company: "Orion Financial Group", contactFirst: "James", deal: "Orion Risk Platform", title: "Prepare board presentation materials", description: "Create executive summary and ROI deck for board review", status: "TODO", priority: "URGENT", dueDate: "2026-05-12" },
  { company: "Orion Financial Group", deal: "Orion Data Migration", title: "Complete data migration POC", description: "Run proof-of-concept migration with sample dataset", status: "IN_PROGRESS", priority: "HIGH", dueDate: "2026-05-22" },
  { company: "Meridian Healthcare", deal: "Meridian Patient Portal", title: "Obtain BAA template", description: "Get Business Associate Agreement template from legal", status: "TODO", priority: "NORMAL", dueDate: "2026-05-30" },
  { company: "Meridian Healthcare", title: "Find healthcare reference customers", description: "Identify 2-3 reference customers in healthcare for Noah's board presentation", status: "IN_PROGRESS", priority: "HIGH", dueDate: "2026-05-16" },
  { company: "Cobalt Media", deal: "Cobalt Ad Platform License", title: "Finalize contract terms", description: "Address redlined items and get final approval from legal", status: "IN_PROGRESS", priority: "URGENT", dueDate: "2026-05-10" },
  { company: "Vanguard Robotics", deal: "Vanguard IoT Dashboard", title: "Set up pilot environment", description: "Provision sandbox environment for Vanguard's POC evaluation", status: "TODO", priority: "NORMAL", dueDate: "2026-06-01" },
  { company: "Horizon Energy", deal: "Horizon Grid Analytics", title: "Draft implementation timeline", description: "Create detailed project plan with milestones for grid analytics deployment", status: "TODO", priority: "HIGH", dueDate: "2026-05-25" },
  { company: "Forge Manufacturing", deal: "Forge ERP Integration", title: "Complete integration testing", description: "Run full integration test suite against their staging ERP", status: "IN_PROGRESS", priority: "HIGH", dueDate: "2026-05-18" },
  { company: "Cascade Software", deal: "Cascade White-Label Platform", title: "Draft partnership agreement", description: "Work with legal on revenue share and white-label terms", status: "TODO", priority: "HIGH", dueDate: "2026-05-28" },
  { company: "Pacific Foods Co", deal: "Pacific Distribution Platform", title: "Confirm implementation timeline", description: "Verify we can complete deployment before September peak season", status: "TODO", priority: "URGENT", dueDate: "2026-05-11" },
  { company: "Silverline Pharma", title: "Research FDA 21 CFR Part 11", description: "Document how our platform meets FDA electronic records requirements", status: "TODO", priority: "NORMAL", dueDate: "2026-06-15" },
  { title: "Update CRM pipeline stages", description: "Review and adjust pipeline stage probabilities based on Q1 data", status: "TODO", priority: "URGENT", dueDate: "2026-05-12" },
  { title: "Prepare monthly forecast report", description: "Compile deal pipeline forecast for leadership review", status: "TODO", priority: "HIGH", dueDate: "2026-05-14" },
  { title: "Review competitor pricing updates", description: "InsureTech Pro and 2 others updated pricing — need competitive analysis", status: "IN_PROGRESS", priority: "NORMAL", dueDate: "2026-05-20" },
  { company: "Northstar Insurance", title: "Schedule win-back call", description: "Reach out to Grace about upcoming product improvements that address their concerns", status: "TODO", priority: "LOW", dueDate: "2026-06-30" },
  { company: "Pinnacle Consulting", contactFirst: "David", title: "Send August proposal", description: "Prepare and deliver proposal before their Q3 budget allocation", status: "TODO", priority: "NORMAL", dueDate: "2026-07-31" },
  { company: "Atlas Logistics", title: "Prepare expansion pricing", description: "Model pricing for 3 additional distribution centers Liam mentioned", status: "TODO", priority: "NORMAL", dueDate: "2026-06-15" },
  { company: "Redwood Real Estate", title: "Demo commercial leasing module", description: "Schedule demo of commercial leasing features for Alexander", status: "DONE", priority: "NORMAL", dueDate: "2026-05-05" },
  { company: "Summit Education", title: "Research LMS market landscape", description: "Analyze competitive landscape for education sector positioning", status: "DONE", priority: "LOW", dueDate: "2026-04-30" },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱 Seeding database via API…");

  // 1. Bootstrap user + org via Prisma (auth infrastructure, no API for this)
  const user = await prisma.user.upsert({
    where: { id: SEED_USER_ID },
    create: { id: SEED_USER_ID, email: SEED_USER_EMAIL, displayName: SEED_USER_NAME },
    update: { email: SEED_USER_EMAIL, displayName: SEED_USER_NAME },
  });
  console.log(`  User: ${user.id}`);

  const existingMember = await prisma.organizationMember.findFirst({
    where: { userId: SEED_USER_ID },
  });

  let orgId: string;
  if (existingMember) {
    orgId = existingMember.organizationId;
    console.log(`  Organization (existing): ${orgId}`);
  } else {
    const org = await prisma.organization.create({ data: { name: "Acme Corp" } });
    await prisma.organizationMember.create({
      data: { organizationId: org.id, userId: user.id, role: "ADMIN" },
    });
    orgId = org.id;
    console.log(`  Organization (created): ${orgId}`);
  }

  // 2. Pipeline + Stages via API
  const { data: pipeline } = await api<{ data: { id: string } }>(
    "POST",
    "/pipelines",
    { name: "Sales Pipeline", isDefault: true, position: 0 },
  );
  console.log(`  Pipeline: ${pipeline.id}`);

  const stageDefinitions = [
    { name: "Lead In", position: 0, probability: 10 },
    { name: "Qualified", position: 1, probability: 25 },
    { name: "Proposal", position: 2, probability: 50 },
    { name: "Negotiation", position: 3, probability: 75 },
    { name: "Won", position: 4, probability: 100, isWon: true },
    { name: "Lost", position: 5, probability: 0, isLost: true },
  ] as const;

  const stages: Record<string, string> = {};
  for (const def of stageDefinitions) {
    const { data: stage } = await api<{ data: { id: string; name: string } }>(
      "POST",
      `/pipelines/${pipeline.id}/stages`,
      def,
    );
    stages[def.name] = stage.id;
    console.log(`    Stage: ${stage.name}`);
  }

  // 3. Tags via API
  const tagIds: Record<string, string> = {};
  for (const tag of TAGS) {
    const { data } = await api<{ data: { id: string; name: string } }>("POST", "/tags", tag);
    tagIds[data.name] = data.id;
  }
  console.log(`  Tags: ${TAGS.length} created`);

  // 4. Companies via API
  const companyIds: Record<string, string> = {};
  for (const company of COMPANIES) {
    const { data } = await api<{ data: { id: string; name: string } }>("POST", "/companies", company);
    companyIds[data.name] = data.id;
  }
  console.log(`  Companies: ${COMPANIES.length} created`);

  // 5. Assign tags
  let tagCount = 0;
  for (const [companyName, tags] of Object.entries(TAG_ASSIGNMENTS)) {
    for (const tagName of tags) {
      await api("PUT", `/companies/${companyIds[companyName]}/tags/${tagIds[tagName]}`);
      tagCount++;
    }
  }
  console.log(`  Tag assignments: ${tagCount} created`);

  // 6. Contacts via API
  const contactIds: Record<string, Record<string, string>> = {};
  let contactCount = 0;
  for (const [companyName, contacts] of Object.entries(CONTACTS_PER_COMPANY)) {
    contactIds[companyName] = {};
    for (const contact of contacts) {
      const { data } = await api<{ data: { id: string; firstName: string } }>(
        "POST",
        `/companies/${companyIds[companyName]}/contacts`,
        contact,
      );
      contactIds[companyName][data.firstName] = data.id;
      contactCount++;
    }
  }
  console.log(`  Contacts: ${contactCount} created`);

  // 7. Deals via API
  const dealIds: Record<string, string> = {};
  for (const deal of DEALS) {
    const contactId = deal.contactFirst ? contactIds[deal.company]?.[deal.contactFirst] : undefined;
    const { data } = await api<{ data: { id: string; title: string } }>(
      "POST",
      `/companies/${companyIds[deal.company]}/deals`,
      {
        title: deal.title,
        description: deal.description,
        value: deal.value,
        stageId: stages[deal.stage],
        ...(deal.expectedCloseDate && { expectedCloseDate: deal.expectedCloseDate }),
        ...(contactId && { contactId }),
      },
    );
    dealIds[deal.title] = data.id;
  }
  console.log(`  Deals: ${DEALS.length} created`);

  // 8. Activities via API
  for (const activity of ACTIVITIES) {
    const contactId = activity.contactFirst ? contactIds[activity.company]?.[activity.contactFirst] : undefined;
    const dealId = activity.deal ? dealIds[activity.deal] : undefined;
    await api("POST", `/companies/${companyIds[activity.company]}/activities`, {
      type: activity.type,
      title: activity.title,
      description: activity.description,
      date: activity.date,
      ...(contactId && { contactId }),
      ...(dealId && { dealId }),
    });
  }
  console.log(`  Activities: ${ACTIVITIES.length} created`);

  // 9. Notes via API
  for (const note of NOTES) {
    const contactId = note.contactFirst ? contactIds[note.company]?.[note.contactFirst] : undefined;
    await api("POST", `/companies/${companyIds[note.company]}/notes`, {
      title: note.title,
      body: note.body,
      ...(contactId && { contactId }),
    });
  }
  console.log(`  Notes: ${NOTES.length} created`);

  // 10. Tasks via API
  for (const task of TASKS) {
    const companyId = task.company ? companyIds[task.company] : undefined;
    const contactId = task.contactFirst && task.company ? contactIds[task.company]?.[task.contactFirst] : undefined;
    const dealId = task.deal ? dealIds[task.deal] : undefined;
    const path = companyId ? `/companies/${companyId}/tasks` : "/tasks";
    await api("POST", path, {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      ...(contactId && { contactId }),
      ...(dealId && { dealId }),
    });
  }
  console.log(`  Tasks: ${TASKS.length} created`);

  console.log("\n✅ Seed complete!");
  console.log(`   ${COMPANIES.length} companies, ${contactCount} contacts, ${DEALS.length} deals`);
  console.log(`   ${ACTIVITIES.length} activities, ${NOTES.length} notes, ${TASKS.length} tasks`);
  console.log(`   Events generated automatically by API services.`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
