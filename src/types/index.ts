/* ═══════════════════════════════════════════════════
   ACCENTURE COMPASS — Type Definitions
   ═══════════════════════════════════════════════════ */

// ── Geographic ──
export interface Country {
  id: string;
  name: string;
  code: string; // ISO 3166-1 alpha-3
  region: string;
  subRegion?: string;
  coordinates: [number, number]; // [lng, lat] center point
  overview: CountryOverview;
  available: boolean; // true if we have deep data
}

export interface CountryOverview {
  population: string;
  gdp: string;
  gdpGrowth: string;
  accentureHeadcount: number;
  accentureRevenue: string;
  utilization: number;
  keyIndustries: string[];
  description: string;
}

export interface Region {
  id: string;
  name: string;
  countries: string[]; // country IDs
  totalRevenue: string;
  headcount: number;
}

// ── Talent ──
export interface TalentData {
  countryId: string;
  period: string;
  totalHeadcount: number;
  utilizationRate: number;
  benchPercentage: number;
  attritionRate: number;
  avgTenure: number;
  skillsBreakdown: SkillCategory[];
  levelDistribution: LevelBand[];
  cityDensity: CityTalent[];
  trends: TrendPoint[];
}

export interface SkillCategory {
  name: string;
  count: number;
  percentage: number;
  growth: number;
}

export interface LevelBand {
  level: string;
  count: number;
  percentage: number;
}

export interface CityTalent {
  city: string;
  province: string;
  headcount: number;
  coordinates: [number, number];
}

export interface TrendPoint {
  period: string;
  value: number;
}

// ── Industries ──
export interface Industry {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  globalRevenue: string;
  globalGrowth: string;
  countriesActive: number;
  accentureShare: string;
  color: string;
}

export interface IndustryCountryData {
  industryId: string;
  countryId: string;
  revenue: string;
  revenueValue: number;
  growth: string;
  companiesCount: number;
  employeesInSector: number;
  marketShare: string;
  topCompanies: CompanySummary[];
  trends: TrendPoint[];
  outlook: string;
}

export interface CompanySummary {
  id: string;
  name: string;
  logo?: string;
  revenue: string;
  employees: number;
  growth: string;
  isClient: boolean;
}

// ── Companies & Clients ──
export interface Company {
  id: string;
  name: string;
  slug: string;
  industryId: string;
  countryId: string;
  logo?: string;
  description: string;
  founded: number;
  headquarters: string;
  revenue: string;
  employees: number;
  growth: string;
  marketCap?: string;
  stockTicker?: string;
  accentureEngagement: EngagementSummary;
  topClients?: Client[];
  revenueHistory: TrendPoint[];
}

export interface EngagementSummary {
  startYear: number;
  totalRevenue: string;
  activeProjects: number;
  teamSize: number;
  services: string[];
  satisfaction: number;
}

export interface Client {
  id: string;
  name: string;
  slug: string;
  companyId: string;
  role: string;
  engagementValue: string;
  startDate: string;
  status: 'active' | 'completed' | 'pipeline';
  projects: ProjectSummary[];
  contacts: ContactSummary[];
}

export interface ProjectSummary {
  name: string;
  value: string;
  status: 'active' | 'completed' | 'pipeline';
  startDate: string;
  endDate?: string;
  description: string;
}

export interface ContactSummary {
  name: string;
  role: string;
  department: string;
}

// ── Financials ──
export interface FinancialData {
  countryId: string;
  period: string;
  totalRevenue: string;
  totalRevenueValue: number;
  revenueGrowth: string;
  operatingMargin: string;
  bookings: string;
  pipeline: string;
  serviceLines: ServiceLine[];
  quarterlyRevenue: QuarterlyRevenue[];
  topAccounts: AccountRevenue[];
}

export interface ServiceLine {
  name: string;
  revenue: string;
  revenueValue: number;
  growth: string;
  percentage: number;
}

export interface QuarterlyRevenue {
  quarter: string;
  revenue: number;
  previousYear: number;
}

export interface AccountRevenue {
  name: string;
  revenue: string;
  growth: string;
}

// ── Macro ──
export interface MacroData {
  countryId: string;
  period: string;
  gdp: string;
  gdpGrowth: string;
  inflation: string;
  unemployment: string;
  interestRate: string;
  currencyRate: string;
  tradeBalance: string;
  indicators: MacroIndicator[];
  trends: MacroTrend[];
  risks: RiskItem[];
  opportunities: OpportunityItem[];
}

export interface MacroIndicator {
  name: string;
  value: string;
  change: string;
  direction: 'up' | 'down' | 'stable';
}

export interface MacroTrend {
  name: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
}

export interface RiskItem {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
}

export interface OpportunityItem {
  title: string;
  description: string;
  potential: string;
  timeline: string;
  category: string;
}

// ── Navigation ──
export type LensMode = 'regional' | 'industry';

export interface NavigationState {
  lens: LensMode;
  selectedCountry: string | null;
  selectedIndustry: string | null;
  selectedCompany: string | null;
  breadcrumbs: Breadcrumb[];
}

export interface Breadcrumb {
  label: string;
  href: string;
}

// ── Data Pipeline ──
export interface DataSnapshot {
  id: string;
  period: string;
  status: 'draft' | 'review' | 'approved' | 'live';
  createdAt: string;
  approvedAt?: string;
  changesCount: number;
}

export interface PipelineJob {
  id: string;
  documentName: string;
  status: 'queued' | 'parsing' | 'classifying' | 'extracting' | 'clustering' | 'validating' | 'staged' | 'completed' | 'failed';
  progress: number;
  startedAt: string;
  completedAt?: string;
  results?: Record<string, unknown>;
  errors?: string[];
}

// ── AlphaSense / Trends ──

export interface AffectedCompany {
  name: string;
  ticker: string | null;
  impact: 'positive' | 'negative' | 'neutral';
  detail: string;
}

export interface KeyMetric {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface NewsItem {
  id: number;
  headline: string;
  summary: string;
  source_org: string;
  date: string | null;
  type: string | null;
  url: string | null;
  related_finding_ids: number[];
  analyst_quote?: string;
}

export interface TopCompany {
  name: string;
  ticker: string | null;
  sector: string;
  hq: string;
  revenue: string;
  key_initiatives: string[];
  logo_url?: string;
  linked_findings: {
    trends: number[];
    opportunities: number[];
    challenges: number[];
  };
}

export interface FinancialHighlight {
  id: number;
  metric: string;
  current_value: string;
  previous_value: string | null;
  change: string | null;
  chart_type: 'bar' | 'line' | 'donut';
  data_points: { label: string; value: string }[];
}

export interface AlphaSenseFinding {
  id: number;
  category: 'Emerging Trend' | 'Strategic Opportunity' | 'Key Challenge';
  finding: string;
  description: string;
  impact_level: 'High' | 'Medium' | 'Low' | null;
  timeframe: string | null;
  source: {
    document_title: string | null;
    organization: string | null;
    document_type: string | null;
    date: string | null;
    url: string | null;
    headline: string | null;
  };
  affected_companies?: AffectedCompany[];
  key_metrics?: KeyMetric[];
}

export interface AlphaSensePayload {
  subject: string;
  date_generated: string;
  total_findings: number;
  findings: AlphaSenseFinding[];
  synthesis: string;
  news_items: NewsItem[];
  financial_highlights: FinancialHighlight[];
  metadata: {
    emerging_trend_count: number;
    strategic_opportunity_count: number;
    key_challenge_count: number;
    high_impact_count: number;
    medium_impact_count: number;
    low_impact_count: number;
    news_count: number;
    financial_highlight_count: number;
    top_company_count: number;
  };
  top_companies: TopCompany[];
}

export interface TrendsChallenge {
  t: string;
  d: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  ic: string;
  source?: AlphaSenseFinding['source'];
  affected_companies?: AffectedCompany[];
  key_metrics?: KeyMetric[];
}

export interface TrendsOpportunity {
  t: string;
  p: string;
  timeline: string;
  d: string;
  ic: string;
  priority?: number;
  source?: AlphaSenseFinding['source'];
  affected_companies?: AffectedCompany[];
  key_metrics?: KeyMetric[];
}

export interface TrendsTrend {
  t: string;
  tag: string;
  d: string;
  ic: string;
  source?: AlphaSenseFinding['source'];
  affected_companies?: AffectedCompany[];
  key_metrics?: KeyMetric[];
}

export interface TrendsData {
  challenges: TrendsChallenge[];
  opportunities: TrendsOpportunity[];
  trends: TrendsTrend[];
  synthesis: string;
  source: {
    subject: string;
    date_generated: string;
    total_findings: number;
  };
  news_items?: NewsItem[];
  financial_highlights?: FinancialHighlight[];
  images?: { src: string; caption?: string }[];
  top_companies?: TopCompany[];
}
