import { useState, useCallback, useEffect } from "react";
import type { Spec } from "@json-render/react";
import {
  Box,
  ContextView,
  Divider,
  Button,
  TextField,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  List,
  ListItem,
  Spinner,
} from "@stripe/ui-extension-sdk/ui";
import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";

import BrandIcon from "./brand_icon.svg";
import { stripeCatalog, StripeRenderer } from "../lib/render";
import { executeAction } from "../lib/render/catalog/actions";

// =============================================================================
// Dynamic Specs (use real data from context)
// =============================================================================

function createRevenueSpec(data: Record<string, unknown>): Spec {
  const customers = data.customers as { total?: number } | undefined;
  const payments = data.payments as
    | { totalVolume?: string; successRate?: string }
    | undefined;
  const subscriptions = data.subscriptions as
    | { active?: number; trialing?: number; pastDue?: number }
    | undefined;

  return {
    root: "root",
    elements: {
      root: {
        key: "root",
        type: "Stack",
        props: { direction: "vertical", gap: "large" },
        children: ["heading", "metrics", "refresh"],
        parentKey: null,
      },
      heading: {
        key: "heading",
        type: "Heading",
        props: { text: "Revenue Dashboard", size: "xlarge" },
        children: [],
        parentKey: "root",
      },
      metrics: {
        key: "metrics",
        type: "Stack",
        props: { direction: "horizontal", gap: "medium" },
        children: ["m1", "m2", "m3"],
        parentKey: "root",
      },
      m1: {
        key: "m1",
        type: "Metric",
        props: {
          label: "Payment Volume",
          value: payments?.totalVolume ?? "$0",
          change: payments?.successRate
            ? `${payments.successRate} success`
            : null,
          changeType: "positive",
        },
        children: [],
        parentKey: "metrics",
      },
      m2: {
        key: "m2",
        type: "Metric",
        props: {
          label: "Active Subscriptions",
          value: String(subscriptions?.active ?? 0),
          change: subscriptions?.trialing
            ? `+${subscriptions.trialing} trialing`
            : null,
          changeType: "positive",
        },
        children: [],
        parentKey: "metrics",
      },
      m3: {
        key: "m3",
        type: "Metric",
        props: {
          label: "Total Customers",
          value: String(customers?.total ?? 0),
          changeType: "neutral",
        },
        children: [],
        parentKey: "metrics",
      },
      refresh: {
        key: "refresh",
        type: "Button",
        props: {
          label: "Refresh Data",
          action: "refreshData",
          type: "secondary",
        },
        children: [],
        parentKey: "root",
      },
    },
  };
}

function createPaymentsSpec(data: Record<string, unknown>): Spec {
  const payments = data.payments as
    | {
        data?: Array<{
          id: string;
          formattedAmount: string;
          status: string;
          description: string;
        }>;
        totalVolume?: string;
        successRate?: string;
      }
    | undefined;
  const paymentsList = payments?.data ?? [];

  const elements: Spec["elements"] = {
    root: {
      key: "root",
      type: "Stack",
      props: { direction: "vertical", gap: "large" },
      children: ["heading", "stats", "payments", "refresh"],
      parentKey: null,
    },
    heading: {
      key: "heading",
      type: "Heading",
      props: { text: "Recent Payments", size: "xlarge" },
      children: [],
      parentKey: "root",
    },
    stats: {
      key: "stats",
      type: "Stack",
      props: { direction: "horizontal", gap: "medium" },
      children: ["s1", "s2"],
      parentKey: "root",
    },
    s1: {
      key: "s1",
      type: "Metric",
      props: {
        label: "Total Volume",
        value: payments?.totalVolume ?? "$0",
        changeType: "positive",
      },
      children: [],
      parentKey: "stats",
    },
    s2: {
      key: "s2",
      type: "Metric",
      props: {
        label: "Success Rate",
        value: payments?.successRate ?? "0%",
        changeType: "positive",
      },
      children: [],
      parentKey: "stats",
    },
    payments: {
      key: "payments",
      type: "Stack",
      props: { direction: "vertical", gap: "small" },
      children: paymentsList.slice(0, 5).map((_, i) => `p${i}`),
      parentKey: "root",
    },
    refresh: {
      key: "refresh",
      type: "Button",
      props: {
        label: "Refresh Payments",
        action: "fetchPayments",
        type: "secondary",
      },
      children: [],
      parentKey: "root",
    },
  };

  paymentsList.slice(0, 5).forEach((p, i) => {
    elements[`p${i}`] = {
      key: `p${i}`,
      type: "PaymentCard",
      props: {
        amount: 0, // We'll use formattedAmount in description
        currency: "usd",
        status: p.status as "succeeded" | "pending" | "failed",
        description: `${p.formattedAmount} - ${p.description}`,
        paymentId: p.id,
      },
      children: [],
      parentKey: "payments",
    };
  });

  return { root: "root", elements };
}

function createSubscriptionsSpec(data: Record<string, unknown>): Spec {
  const subscriptions = data.subscriptions as
    | {
        data?: Array<{
          id: string;
          planName: string;
          status: string;
          amount: number;
          interval: string;
        }>;
        active?: number;
        trialing?: number;
        pastDue?: number;
      }
    | undefined;
  const subsList = subscriptions?.data ?? [];

  const elements: Spec["elements"] = {
    root: {
      key: "root",
      type: "Stack",
      props: { direction: "vertical", gap: "large" },
      children: ["heading", "metrics", "alert", "subs", "refresh"],
      parentKey: null,
    },
    heading: {
      key: "heading",
      type: "Heading",
      props: { text: "Subscriptions Overview", size: "xlarge" },
      children: [],
      parentKey: "root",
    },
    metrics: {
      key: "metrics",
      type: "Stack",
      props: { direction: "horizontal", gap: "medium" },
      children: ["m1", "m2", "m3"],
      parentKey: "root",
    },
    m1: {
      key: "m1",
      type: "Metric",
      props: {
        label: "Active",
        value: String(subscriptions?.active ?? 0),
        changeType: "positive",
      },
      children: [],
      parentKey: "metrics",
    },
    m2: {
      key: "m2",
      type: "Metric",
      props: {
        label: "Trialing",
        value: String(subscriptions?.trialing ?? 0),
        changeType: "positive",
      },
      children: [],
      parentKey: "metrics",
    },
    m3: {
      key: "m3",
      type: "Metric",
      props: {
        label: "Past Due",
        value: String(subscriptions?.pastDue ?? 0),
        changeType: subscriptions?.pastDue ? "negative" : "neutral",
      },
      children: [],
      parentKey: "metrics",
    },
    alert: {
      key: "alert",
      type: "Banner",
      props: {
        title: `${subscriptions?.trialing ?? 0} subscriptions currently trialing`,
        type: "default",
      },
      children: [],
      parentKey: "root",
    },
    subs: {
      key: "subs",
      type: "Stack",
      props: { direction: "vertical", gap: "small" },
      children: subsList.slice(0, 5).map((_, i) => `sub${i}`),
      parentKey: "root",
    },
    refresh: {
      key: "refresh",
      type: "Button",
      props: {
        label: "Refresh Subscriptions",
        action: "fetchSubscriptions",
        type: "secondary",
      },
      children: [],
      parentKey: "root",
    },
  };

  subsList.slice(0, 5).forEach((s, i) => {
    elements[`sub${i}`] = {
      key: `sub${i}`,
      type: "SubscriptionCard",
      props: {
        planName: s.planName,
        status: s.status as "active" | "trialing" | "past_due" | "canceled",
        amount: s.amount,
        interval: (s.interval as "month" | "year") ?? "month",
      },
      children: [],
      parentKey: "subs",
    };
  });

  return { root: "root", elements };
}

function createCustomersSpec(data: Record<string, unknown>): Spec {
  const customers = data.customers as
    | {
        data?: Array<{
          id: string;
          name: string;
          email: string;
          status: string;
        }>;
        total?: number;
      }
    | undefined;
  const customersList = customers?.data ?? [];

  const elements: Spec["elements"] = {
    root: {
      key: "root",
      type: "Stack",
      props: { direction: "vertical", gap: "large" },
      children: ["heading", "stats", "customers", "refresh"],
      parentKey: null,
    },
    heading: {
      key: "heading",
      type: "Heading",
      props: { text: "Customer Directory", size: "xlarge" },
      children: [],
      parentKey: "root",
    },
    stats: {
      key: "stats",
      type: "Stack",
      props: { direction: "horizontal", gap: "medium" },
      children: ["s1"],
      parentKey: "root",
    },
    s1: {
      key: "s1",
      type: "Metric",
      props: {
        label: "Total Customers",
        value: String(customers?.total ?? 0),
        changeType: "neutral",
      },
      children: [],
      parentKey: "stats",
    },
    customers: {
      key: "customers",
      type: "Stack",
      props: { direction: "vertical", gap: "small" },
      children: customersList.slice(0, 5).map((_, i) => `c${i}`),
      parentKey: "root",
    },
    refresh: {
      key: "refresh",
      type: "Button",
      props: {
        label: "Refresh Customers",
        action: "fetchCustomers",
        type: "secondary",
      },
      children: [],
      parentKey: "root",
    },
  };

  customersList.slice(0, 5).forEach((c, i) => {
    elements[`c${i}`] = {
      key: `c${i}`,
      type: "CustomerCard",
      props: {
        name: c.name,
        email: c.email,
        status: c.status as "active" | "inactive",
        customerId: c.id,
      },
      children: [],
      parentKey: "customers",
    };
  });

  return { root: "root", elements };
}

function createInvoicesSpec(data: Record<string, unknown>): Spec {
  const invoices = data.invoices as
    | {
        data?: Array<{
          id: string;
          invoiceNumber: string;
          amount: number;
          status: string;
          dueDate: string | null;
        }>;
        outstanding?: string;
        paid?: string;
        overdue?: string;
      }
    | undefined;
  const invoicesList = invoices?.data ?? [];

  const elements: Spec["elements"] = {
    root: {
      key: "root",
      type: "Stack",
      props: { direction: "vertical", gap: "large" },
      children: ["heading", "stats", "invoices", "refresh"],
      parentKey: null,
    },
    heading: {
      key: "heading",
      type: "Heading",
      props: { text: "Invoice Management", size: "xlarge" },
      children: [],
      parentKey: "root",
    },
    stats: {
      key: "stats",
      type: "Stack",
      props: { direction: "horizontal", gap: "medium" },
      children: ["s1", "s2", "s3"],
      parentKey: "root",
    },
    s1: {
      key: "s1",
      type: "Metric",
      props: {
        label: "Outstanding",
        value: invoices?.outstanding ?? "$0",
        changeType: "neutral",
      },
      children: [],
      parentKey: "stats",
    },
    s2: {
      key: "s2",
      type: "Metric",
      props: {
        label: "Paid",
        value: invoices?.paid ?? "$0",
        changeType: "positive",
      },
      children: [],
      parentKey: "stats",
    },
    s3: {
      key: "s3",
      type: "Metric",
      props: {
        label: "Overdue",
        value: invoices?.overdue ?? "$0",
        changeType: invoices?.overdue !== "$0.00" ? "negative" : "neutral",
      },
      children: [],
      parentKey: "stats",
    },
    invoices: {
      key: "invoices",
      type: "Stack",
      props: { direction: "vertical", gap: "small" },
      children: invoicesList.slice(0, 5).map((_, i) => `inv${i}`),
      parentKey: "root",
    },
    refresh: {
      key: "refresh",
      type: "Button",
      props: {
        label: "Refresh Invoices",
        action: "fetchInvoices",
        type: "secondary",
      },
      children: [],
      parentKey: "root",
    },
  };

  invoicesList.slice(0, 5).forEach((inv, i) => {
    elements[`inv${i}`] = {
      key: `inv${i}`,
      type: "InvoiceCard",
      props: {
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        status: inv.status as "draft" | "open" | "paid" | "void",
        dueDate: inv.dueDate,
      },
      children: [],
      parentKey: "invoices",
    };
  });

  return { root: "root", elements };
}

// =============================================================================
// Catalog Info for Display
// =============================================================================

const componentCatalogInfo = Object.entries(stripeCatalog.data.components).map(
  ([name, def]) => ({
    name,
    description: def.description,
  }),
);

const actionsCatalogInfo = Object.entries(stripeCatalog.data.actions).map(
  ([name, def]) => ({
    name,
    description: def.description,
  }),
);

// =============================================================================
// Home Component
// =============================================================================

const Home = (_props: ExtensionContextValue) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSpec, setCurrentSpec] = useState<Spec | null>(null);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);

  const handleSetData = useCallback(
    (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => {
      setData((prev) => updater(prev));
    },
    [],
  );

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        await executeAction("refreshData", {}, handleSetData, {});
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("Failed to load Stripe data");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [handleSetData]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:3000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          systemPrompt: stripeCatalog.prompt({
            system:
              "You are a Stripe dashboard widget builder. Generate UI specs for displaying Stripe data.",
          }),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const responseData = await response.json();
        if (responseData.spec) {
          setCurrentSpec(responseData.spec);
          return;
        } else if (responseData.error) {
          throw new Error(responseData.error);
        }
      }
      throw new Error("Invalid response");
    } catch (err) {
      // Use dynamic specs with real data as fallback
      const lowerPrompt = prompt.toLowerCase();

      if (
        lowerPrompt.includes("payment") ||
        lowerPrompt.includes("transaction")
      ) {
        setCurrentSpec(createPaymentsSpec(data));
      } else if (
        lowerPrompt.includes("subscription") ||
        lowerPrompt.includes("recurring")
      ) {
        setCurrentSpec(createSubscriptionsSpec(data));
      } else if (
        lowerPrompt.includes("customer") ||
        lowerPrompt.includes("user")
      ) {
        setCurrentSpec(createCustomersSpec(data));
      } else if (
        lowerPrompt.includes("invoice") ||
        lowerPrompt.includes("billing")
      ) {
        setCurrentSpec(createInvoicesSpec(data));
      } else {
        setCurrentSpec(createRevenueSpec(data));
      }

      setError(
        `Using local generation (${err instanceof Error ? err.message : "API unavailable"})`,
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ContextView
      title="json-render Demo"
      brandColor="#635BFF"
      brandIcon={BrandIcon}
      externalLink={{
        label: "json-render docs",
        href: "https://github.com/vercel-labs/json-render",
      }}
    >
      {isLoading ? (
        <Box
          css={{
            stack: "y",
            gap: "medium",
            alignX: "center",
            paddingY: "xlarge",
          }}
        >
          <Spinner size="large" />
          <Box css={{ font: "body", color: "secondary" }}>
            Loading Stripe data...
          </Box>
        </Box>
      ) : (
        <Tabs fitted>
          <TabList>
            <Tab id="generate">Generate</Tab>
            <Tab id="components">Components</Tab>
            <Tab id="actions">Actions</Tab>
          </TabList>
          <TabPanels>
            {/* Generate Tab */}
            <TabPanel id="generate">
              <Box css={{ stack: "y", gap: "medium", paddingY: "medium" }}>
                <TextField
                  label="Describe the dashboard you want"
                  placeholder="e.g., Show MRR, payments, or subscriptions"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <Button
                  type="primary"
                  onPress={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                >
                  {isGenerating ? "Generating..." : "Generate"}
                </Button>

                {error && (
                  <Box css={{ color: "secondary", font: "caption" }}>
                    {error}
                  </Box>
                )}

                {currentSpec && (
                  <>
                    <Divider />
                    <Box css={{ font: "subheading" }}>
                      Preview (with real Stripe data)
                    </Box>
                    <Box
                      css={{
                        padding: "medium",
                        borderRadius: "medium",
                        keyline: "neutral",
                      }}
                    >
                      <StripeRenderer
                        spec={currentSpec}
                        data={data}
                        setData={handleSetData}
                        loading={isGenerating}
                      />
                    </Box>
                  </>
                )}

                <Divider />
                <Box css={{ font: "caption", color: "secondary" }}>
                  Try: &quot;Show revenue metrics&quot; &bull; &quot;Show recent
                  payments&quot; &bull; &quot;Show subscriptions&quot; &bull;
                  &quot;Show customers&quot; &bull; &quot;Show invoices&quot;
                </Box>
              </Box>
            </TabPanel>

            {/* Components Catalog Tab */}
            <TabPanel id="components">
              <Box css={{ paddingY: "medium" }}>
                <Box css={{ font: "subheading", marginBottom: "medium" }}>
                  Available Components ({componentCatalogInfo.length})
                </Box>
                <List>
                  {componentCatalogInfo.map((comp) => (
                    <ListItem
                      key={comp.name}
                      title={comp.name}
                      secondaryTitle={comp.description}
                    />
                  ))}
                </List>
              </Box>
            </TabPanel>

            {/* Actions Catalog Tab */}
            <TabPanel id="actions">
              <Box css={{ paddingY: "medium" }}>
                <Box css={{ font: "subheading", marginBottom: "medium" }}>
                  Available Actions ({actionsCatalogInfo.length})
                </Box>
                <List>
                  {actionsCatalogInfo.map((action) => (
                    <ListItem
                      key={action.name}
                      title={action.name}
                      secondaryTitle={action.description}
                    />
                  ))}
                </List>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}
    </ContextView>
  );
};

export default Home;
