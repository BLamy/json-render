# Stripe App Example

A [Stripe App](https://stripe.com/docs/stripe-apps) example demonstrating how to use json-render to build dynamic, AI-generated UI within the Stripe Dashboard.

## Overview

This example shows how to integrate json-render with Stripe's UI Extension SDK to create dashboard views that can be dynamically generated from prompts. The app includes:

- **Home** - Revenue dashboard with AI-powered UI generation
- **Customers** - Customer list and management
- **Customer Details** - Individual customer view
- **Payments** - Payment list and details
- **Subscriptions** - Subscription management
- **Invoices** - Invoice list
- **Products** - Product catalog

## Features

- Full Stripe UIXT component catalog mapped to json-render
- Dynamic spec generation from natural language prompts
- Real-time data binding with Stripe API
- Action handlers for Stripe operations (refunds, subscriptions, etc.)

## Getting Started

### Prerequisites

- [Stripe CLI](https://stripe.com/docs/stripe-cli) installed
- A Stripe account with app development enabled

### Installation

```bash
# Install dependencies
pnpm install

# Start the Stripe App in development mode
stripe apps start
```

### Development

The app uses the Stripe UI Extension SDK which handles authentication automatically - no API keys required in your environment.

```bash
# Run linting
pnpm lint

# Run tests
pnpm test
```

## How It Works

1. **Component Catalog**: Maps json-render component types to Stripe UIXT components (`Box`, `Button`, `Badge`, etc.)

2. **Action Handlers**: Defines actions that can be triggered from the UI (e.g., `refundPayment`, `cancelSubscription`)

3. **StripeRenderer**: A custom renderer that uses the Stripe component catalog to render json-render specs

4. **Views**: Each view fetches data from the Stripe API and renders it using json-render specs

## Example Usage

```tsx
import { StripeRenderer, stripeCatalog } from "./lib/render";
import type { Spec } from "@json-render/react";

const spec: Spec = {
  root: "container",
  elements: {
    container: {
      key: "container",
      type: "Stack",
      props: { direction: "vertical", gap: "medium" },
      children: ["heading", "metric"],
      parentKey: null,
    },
    heading: {
      key: "heading",
      type: "Heading",
      props: { text: "Revenue", size: "large" },
      children: [],
      parentKey: "container",
    },
    metric: {
      key: "metric",
      type: "Metric",
      props: { label: "Total", value: "$12,345", format: "currency" },
      children: [],
      parentKey: "container",
    },
  },
};

function MyView() {
  return <StripeRenderer spec={spec} catalog={stripeCatalog} />;
}
```

## Learn More

- [json-render Documentation](https://json-render.com/docs)
- [Stripe Apps Documentation](https://stripe.com/docs/stripe-apps)
- [Stripe UI Extension SDK](https://stripe.com/docs/stripe-apps/reference/ui-extension-sdk)
