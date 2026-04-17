export interface FaqItem {
  question: string;
  answer: string;
}

export interface PlanFeature {
  text: string;
}

export interface Plan {
  id: string;
  name: string;
  price: string | null;
  priceLabel: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  badge?: string;
}

export interface Step {
  number: string;
  title: string;
  description: string;
}

export interface NavLink {
  label: string;
  href: string;
}
