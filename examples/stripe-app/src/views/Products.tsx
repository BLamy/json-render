import { useState, useEffect, useCallback } from "react";
import type { Spec } from "@json-render/react";
import {
  Box,
  ContextView,
  Button,
  TextField,
  Spinner,
} from "@stripe/ui-extension-sdk/ui";
import type { ExtensionContextValue } from "@stripe/ui-extension-sdk/context";

import BrandIcon from "./brand_icon.svg";
import { stripeCatalog, StripeRenderer } from "../lib/render";
import { executeAction } from "../lib/render/catalog/actions";

// =============================================================================
// Dynamic Spec Creation
// =============================================================================

function createProductsSpec(data: Record<string, unknown>): Spec {
  const products = data.products as
    | {
        data?: Array<{
          id: string;
          name: string;
          description: string;
          active: boolean;
          created: string;
        }>;
        total?: number;
        hasMore?: boolean;
      }
    | undefined;

  const prices = data.prices as
    | {
        data?: Array<{
          id: string;
          productId: string;
          formattedAmount: string;
          type: string;
          recurring?: { interval: string };
        }>;
      }
    | undefined;

  const productsList = products?.data ?? [];
  const pricesList = prices?.data ?? [];

  const elements: Spec["elements"] = {
    root: {
      key: "root",
      type: "Stack",
      props: { direction: "vertical", gap: "large" },
      children: ["heading", "metrics", "filters", "list", "pagination"],
      parentKey: null,
    },
    heading: {
      key: "heading",
      type: "Heading",
      props: { text: "Products & Prices", size: "xlarge" },
      children: [],
      parentKey: "root",
    },
    metrics: {
      key: "metrics",
      type: "Stack",
      props: { direction: "horizontal", gap: "medium" },
      children: ["productsMetric", "pricesMetric", "activeMetric"],
      parentKey: "root",
    },
    productsMetric: {
      key: "productsMetric",
      type: "Metric",
      props: {
        label: "Total Products",
        value: String(products?.total ?? 0),
        changeType: "neutral",
      },
      children: [],
      parentKey: "metrics",
    },
    pricesMetric: {
      key: "pricesMetric",
      type: "Metric",
      props: {
        label: "Total Prices",
        value: String(pricesList.length ?? 0),
        changeType: "neutral",
      },
      children: [],
      parentKey: "metrics",
    },
    activeMetric: {
      key: "activeMetric",
      type: "Metric",
      props: {
        label: "Active Products",
        value: String(productsList.filter((p) => p.active).length ?? 0),
        changeType: "positive",
      },
      children: [],
      parentKey: "metrics",
    },
    filters: {
      key: "filters",
      type: "Stack",
      props: { direction: "horizontal", gap: "small" },
      children: ["refreshBtn", "createBtn"],
      parentKey: "root",
    },
    refreshBtn: {
      key: "refreshBtn",
      type: "Button",
      props: { label: "Refresh", action: "fetchProducts", type: "secondary" },
      children: [],
      parentKey: "filters",
    },
    createBtn: {
      key: "createBtn",
      type: "Button",
      props: {
        label: "Create Product",
        action: "openDashboard",
        actionParams: { page: "products" },
        type: "primary",
      },
      children: [],
      parentKey: "filters",
    },
    list: {
      key: "list",
      type: "Stack",
      props: { direction: "vertical", gap: "small" },
      children: productsList.slice(0, 10).map((_, i) => `product${i}`),
      parentKey: "root",
    },
    pagination: {
      key: "pagination",
      type: "Stack",
      props: { direction: "horizontal", gap: "small" },
      children: products?.hasMore ? ["loadMore"] : [],
      parentKey: "root",
    },
    loadMore: {
      key: "loadMore",
      type: "Button",
      props: {
        label: "Load More",
        action: "fetchProducts",
        actionParams: { limit: 10 },
        type: "secondary",
      },
      children: [],
      parentKey: "pagination",
    },
  };

  productsList.slice(0, 10).forEach((p, i) => {
    const productPrices = pricesList.filter((pr) => pr.productId === p.id);
    const priceDisplay =
      productPrices.length > 0
        ? productPrices
            .map(
              (pr) =>
                `${pr.formattedAmount}${pr.recurring ? `/${pr.recurring.interval}` : ""}`,
            )
            .join(", ")
        : "No prices";

    elements[`product${i}`] = {
      key: `product${i}`,
      type: "Stack",
      props: { direction: "vertical", gap: "small" },
      children: [`productCard${i}`],
      parentKey: "list",
    };

    elements[`productCard${i}`] = {
      key: `productCard${i}`,
      type: "PropertyList",
      props: { orientation: "vertical" },
      children: [
        `productName${i}`,
        `productDesc${i}`,
        `productPrice${i}`,
        `productStatus${i}`,
      ],
      parentKey: `product${i}`,
    };

    elements[`productName${i}`] = {
      key: `productName${i}`,
      type: "PropertyListItem",
      props: { label: "Name", value: p.name },
      children: [],
      parentKey: `productCard${i}`,
    };

    elements[`productDesc${i}`] = {
      key: `productDesc${i}`,
      type: "PropertyListItem",
      props: { label: "Description", value: p.description || "No description" },
      children: [],
      parentKey: `productCard${i}`,
    };

    elements[`productPrice${i}`] = {
      key: `productPrice${i}`,
      type: "PropertyListItem",
      props: { label: "Prices", value: priceDisplay },
      children: [],
      parentKey: `productCard${i}`,
    };

    elements[`productStatus${i}`] = {
      key: `productStatus${i}`,
      type: "PropertyListItem",
      props: { label: "Status", value: p.active ? "Active" : "Archived" },
      children: [],
      parentKey: `productCard${i}`,
    };
  });

  return { root: "root", elements };
}

// =============================================================================
// Component
// =============================================================================

const Products = (_props: ExtensionContextValue) => {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [spec, setSpec] = useState<Spec | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleSetData = useCallback(
    (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => {
      setData((prev) => updater(prev));
    },
    [],
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        executeAction("fetchProducts", { limit: 10 }, handleSetData, {}),
        executeAction("fetchPrices", { limit: 50 }, handleSetData, {}),
      ]);
      setLoading(false);
    };
    loadData();
  }, [handleSetData]);

  useEffect(() => {
    if (!loading && Object.keys(data).length > 0) {
      setSpec(createProductsSpec(data));
    }
  }, [data, loading]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);

    const systemPrompt = stripeCatalog.prompt();

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemPrompt }),
      });

      const result = await response.json();
      if (result.spec) {
        setSpec(result.spec);
      }
    } catch (error) {
      console.error("Generation error:", error);
      setSpec(createProductsSpec(data));
    }

    setGenerating(false);
  };

  if (loading) {
    return (
      <ContextView title="Products" brandColor="#635BFF" brandIcon={BrandIcon}>
        <Box
          css={{
            stack: "y",
            gap: "medium",
            alignX: "center",
            paddingY: "xlarge",
          }}
        >
          <Spinner size="large" />
          <Box css={{ color: "secondary" }}>Loading products...</Box>
        </Box>
      </ContextView>
    );
  }

  return (
    <ContextView
      title="Products & Prices"
      brandColor="#635BFF"
      brandIcon={BrandIcon}
      actions={
        <Button
          type="primary"
          onPress={() =>
            executeAction(
              "openDashboard",
              { page: "products" },
              handleSetData,
              data,
            )
          }
        >
          Open in Dashboard
        </Button>
      }
    >
      <Box css={{ stack: "y", gap: "medium" }}>
        <Box css={{ stack: "x", gap: "small" }}>
          <Box css={{ width: "fill" }}>
            <TextField
              label=""
              placeholder="Describe the products view you want..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </Box>
          <Box css={{ alignSelfY: "center" }}>
            <Button
              type="primary"
              onPress={handleGenerate}
              disabled={generating || !prompt.trim()}
            >
              {generating ? "Generating..." : "Generate"}
            </Button>
          </Box>
        </Box>

        {spec && (
          <StripeRenderer
            spec={spec}
            data={data}
            setData={handleSetData}
            loading={generating}
          />
        )}
      </Box>
    </ContextView>
  );
};

export default Products;
